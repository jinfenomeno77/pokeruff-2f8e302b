import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Also check hash for recovery type
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async () => {
    setError("");
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        return;
      }
      setSuccess(true);
      setTimeout(() => navigate("/"), 2000);
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen pb-20 md:pb-10 flex flex-col items-center pt-6 md:pt-16 px-4">
        <div className="w-full max-w-sm text-center">
          <p className="text-muted-foreground text-sm">Verificando link de recuperação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-10 flex flex-col items-center pt-6 md:pt-16 px-4">
      <div className="w-full max-w-sm">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao login
        </Link>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-6">
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">POKERUFF</h1>
            <p className="text-sm text-muted-foreground">Defina sua nova senha</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            {success ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-foreground font-medium">Senha alterada com sucesso!</p>
                <p className="text-xs text-muted-foreground">Redirecionando...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Nova senha</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Confirmar senha</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {error && <p className="text-xs text-destructive">{error}</p>}

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors mt-2 disabled:opacity-50"
                >
                  {loading ? "Aguarde..." : "Alterar senha"}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
