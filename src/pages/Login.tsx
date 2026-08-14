import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Mode = "login" | "register" | "forgot";

export default function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      if (mode === "forgot") {
        if (!email.trim()) { setError("Informe seu e-mail."); return; }
        const appOrigin =
          window.location.hostname === "localhost"
            ? window.location.origin
            : "https://pokeruff.lovable.app";
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${appOrigin}/reset-password`,
        });
        if (error) { setError(error.message); return; }
        setForgotSent(true);
        return;
      }
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) { setError(error); return; }
      } else {
        if (!firstName.trim() || !lastName.trim()) { setError("Preencha nome e sobrenome."); return; }
        const { error } = await signUp(email, password, firstName.trim(), lastName.trim());
        if (error) { setError(error); return; }
      }
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 md:pb-10 flex flex-col items-center pt-6 md:pt-16 px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-6">
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">POKERUFF</h1>
            <p className="text-sm text-muted-foreground">
              {mode === "login" ? "Acesse sua conta" : mode === "register" ? "Crie sua conta" : "Recupere sua senha"}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            {mode !== "forgot" && (
              <div className="flex gap-1 mb-5 rounded-lg bg-secondary p-1">
                <button
                  onClick={() => { setMode("login"); setError(""); }}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    mode === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Entrar
                </button>
                <button
                  onClick={() => { setMode("register"); setError(""); }}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    mode === "register" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Cadastrar
                </button>
              </div>
            )}

            {mode === "forgot" && forgotSent ? (
              <div className="text-center py-4 space-y-2">
                <p className="text-sm text-foreground font-medium">E-mail enviado!</p>
                <p className="text-xs text-muted-foreground">Verifique sua caixa de entrada para redefinir sua senha.</p>
                <button
                  onClick={() => { setMode("login"); setForgotSent(false); setError(""); }}
                  className="text-xs text-primary hover:underline mt-2"
                >
                  Voltar ao login
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {mode === "register" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Seu nome"
                        className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Sobrenome</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Seu sobrenome"
                        className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                {mode !== "forgot" && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Senha</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                      className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                )}

                {error && <p className="text-xs text-destructive">{error}</p>}

                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => { setMode("forgot"); setError(""); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Esqueceu sua senha?
                  </button>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors mt-2 disabled:opacity-50"
                >
                  {loading ? "Aguarde..." : mode === "login" ? "Entrar" : mode === "register" ? "Criar conta" : "Enviar link de recuperação"}
                </button>

                {mode === "forgot" && (
                  <button
                    type="button"
                    onClick={() => { setMode("login"); setError(""); }}
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
                  >
                    Voltar ao login
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
