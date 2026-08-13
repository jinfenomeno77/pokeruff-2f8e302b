import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Users, Calendar, Trophy } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo-pokeruff.jpeg";

interface TournamentRow {
  id: string;
  name: string;
  date: string;
  time: string;
  buy_in: number;
  max_players: number;
  status: string;
}

export default function Index() {
  const [nextTournament, setNextTournament] = useState<TournamentRow | null>(null);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("tournaments")
        .select("*")
        .neq("status", "finished")
        .order("date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (data) {
        setNextTournament(data);
        const { count } = await supabase
          .from("tournament_registrations")
          .select("*", { count: "exact", head: true })
          .eq("tournament_id", data.id)
          .eq("status", "confirmed");
        setConfirmedCount(count ?? 0);
      }
      setLoadingStats(false);
    }
    load();
  }, []);

  // Live countdown tick
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const countdown = useMemo(() => {
    if (!nextTournament) return null;
    if (nextTournament.status === "in-progress" || nextTournament.status === "finished") return null;
    const target = new Date(`${nextTournament.date}T${nextTournament.time}`).getTime();
    const diff = target - now;
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return { days, hours, minutes, seconds };
  }, [nextTournament, now]);

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {/* Hero */}
      <section className="relative overflow-hidden bg-felt px-4 py-16 md:py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 to-background pointer-events-none" />
        <div className="container relative z-10 text-center max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <img src={logo} alt="PokerUFF" className="h-28 w-28 md:h-36 md:w-36 rounded-full object-cover mx-auto mb-5 border-2 border-primary/30 shadow-lg" />
            {countdown ? (
              <div className="flex items-center justify-center gap-3 mb-3">
                {[
                  { val: countdown.days, label: "dias" },
                  { val: countdown.hours, label: "h" },
                  { val: countdown.minutes, label: "min" },
                  { val: countdown.seconds, label: "s" },
                ].map((u) => (
                  <div key={u.label} className="text-center">
                    <span className="font-data text-2xl md:text-3xl font-bold text-ember">{u.val.toString().padStart(2, "0")}</span>
                    <span className="text-xs text-muted-foreground ml-0.5">{u.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary mb-3">
                Poker Tournament
              </p>
            )}
            <h1 className="font-display text-5xl md:text-7xl font-bold text-gradient-gold mb-4">
              POKERUFF
            </h1>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-8 max-w-md mx-auto">
              Torneios presenciais de Texas Hold'em com estrutura profissional, ranking em tempo real e muita diversão.
            </p>

            <Link
              to="/tournaments"
              className="group inline-flex items-center gap-2 rounded-lg bg-ember px-6 py-3.5 font-display text-lg font-semibold uppercase tracking-wide text-accent-foreground transition-colors hover:bg-ember/90"
            >
              Inscrever-se no próximo torneio
              <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Quick stats */}
      <section className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            {
              icon: Calendar,
              label: "Próximo",
              value: nextTournament
                ? new Date(nextTournament.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
                : "—",
            },
            {
              icon: Users,
              label: "Inscritos",
              value: nextTournament ? `${confirmedCount}/${nextTournament.max_players}` : "—",
            },
            {
              icon: Trophy,
              label: "Buy-in",
              value: nextTournament ? `R$${nextTournament.buy_in}` : "—",
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border bg-card p-4 text-center card-glow">
              <stat.icon className="h-5 w-5 mx-auto mb-2 text-primary" />
              {loadingStats ? (
                <div className="h-7 w-16 mx-auto rounded bg-muted animate-pulse" />
              ) : (
                <p className="font-data text-xl font-bold text-foreground">{stat.value}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* What is POKERUFF */}
      <section className="container pb-10">
        <div className="rounded-lg border border-border bg-card p-5 md:p-8">
          <h2 className="font-display text-2xl font-bold text-foreground mb-3">O que é o POKERUFF?</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-4">
            Somos um grupo de amigos apaixonados por poker. Organizamos torneios presenciais regulares com estrutura profissional, blinds progressivos e ranking entre os participantes.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { title: "Formato", desc: "Texas Hold'em No-Limit com blinds progressivos" },
              { title: "Frequência", desc: "Torneios mensais" },
              { title: "Premiação", desc: "Prize pool dividido entre os 5 primeiros" },
            ].map((item) => (
              <div key={item.title} className="rounded-lg border border-border p-3">
                <p className="font-display text-sm font-semibold text-accent mb-1">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
