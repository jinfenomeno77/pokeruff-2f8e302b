import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar, DollarSign, ChevronRight, MapPin, Copy, Check, Trophy, X, RotateCcw, AlertTriangle, Pencil } from "lucide-react";
import BlindTimer from "@/components/BlindTimer";
import StackCalculator from "@/components/StackCalculator";
import PlayerNotepad from "@/components/PlayerNotepad";
import { useBlindStructure } from "@/hooks/useBlindStructure";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchTournamentRegistrations,
  getRegistrationInitials,
  getRegistrationName,
  type TournamentRegistration,
} from "@/lib/tournamentRegistrations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const PIX_KEY = "b9441eea-07bb-408d-aa56-666bc02d94a4";

interface TournamentRow {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string | null;
  buy_in: number;
  reentry_fee: number;
  initial_stack: number;
  reentry_stack: number;
  status: string;
  max_players: number;
  total_players: number | null;
  prize_pool: number | null;
  num_tables: number | null;
  current_blind_index: number | null;
  timer_running: boolean | null;
  timer_seconds_left: number | null;
  timer_updated_at: string | null;
  table_names: Record<string, string> | null;
  total_chips_override: number | null;
}

type InscriptionStep = "confirm" | "payment" | "done";

export default function Tournaments() {
  const { user, isAdmin } = useAuth();
  const { structure: blindStructure, lateRegistrationEndIndex: LATE_REGISTRATION_END_INDEX } = useBlindStructure();
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<TournamentRow | null>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const openRequestRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [inscriptionStep, setInscriptionStep] = useState<InscriptionStep | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [userRegistration, setUserRegistration] = useState<TournamentRegistration | null>(null);
  const [copied, setCopied] = useState(false);
  const [champions, setChampions] = useState<Record<string, string>>({});
  const [liveRegistrations, setLiveRegistrations] = useState<TournamentRegistration[]>([]);
  const [editingStackId, setEditingStackId] = useState<string | null>(null);
  const [editingStackValue, setEditingStackValue] = useState("");
  const [editingTotalChips, setEditingTotalChips] = useState(false);
  const [editingTotalChipsValue, setEditingTotalChipsValue] = useState("");

  // Live timer state for break detection
  const [liveBlindIndex, setLiveBlindIndex] = useState<number>(0);
  const [liveTimeLeft, setLiveTimeLeft] = useState<number>(0);
  const [liveTimerRunning, setLiveTimerRunning] = useState(false);

  const [liveTournamentId, setLiveTournamentId] = useState<string | null>(null);

  useEffect(() => {
    loadTournaments();
  }, []);

  // Subscribe to realtime for live tournament — keyed on stable ID
  useEffect(() => {
    if (!liveTournamentId) return;

    const channel = supabase
      .channel(`live-tournament-${liveTournamentId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "tournaments",
        filter: `id=eq.${liveTournamentId}`,
      }, (payload: any) => {
        const row = payload.new;
        // Update the tournament row in state for BlindTimer sync props
        setTournaments((prev) =>
          prev.map((t) => (t.id === liveTournamentId ? { ...t, ...row } : t))
        );
        setLiveBlindIndex(row.current_blind_index ?? 0);
        setLiveTimerRunning(row.timer_running ?? false);
        if (row.timer_running && row.timer_updated_at) {
          const elapsed = Math.floor((Date.now() - new Date(row.timer_updated_at).getTime()) / 1000);
          setLiveTimeLeft(Math.max(0, (row.timer_seconds_left ?? 0) - elapsed));
        } else {
          setLiveTimeLeft(row.timer_seconds_left ?? 0);
        }
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "tournament_registrations",
        filter: `tournament_id=eq.${liveTournamentId}`,
      }, () => {
        fetchTournamentRegistrations(liveTournamentId).then(setLiveRegistrations);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [liveTournamentId]);

  // Local countdown for break detection
  useEffect(() => {
    if (!liveTimerRunning) return;
    const interval = setInterval(() => {
      setLiveTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [liveTimerRunning]);

  async function loadTournaments() {
    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .order("date", { ascending: false });
    if (data) {
      setTournaments(data as TournamentRow[]);
      const finished = (data as TournamentRow[]).filter((t) => t.status === "finished");
      const champMap: Record<string, string> = {};
      if (finished.length > 0) {
        const { data: regs } = await supabase
          .from("tournament_registrations")
          .select("id, tournament_id, user_id, player_name, position, status, table_number")
          .in("tournament_id", finished.map((t) => t.id))
          .eq("position", 1);

        const winners = regs ?? [];
        const missingProfileIds = [
          ...new Set(
            winners
              .filter((r) => !r.player_name?.trim() && r.user_id)
              .map((r) => r.user_id as string),
          ),
        ];

        const profileMap: Record<string, string> = {};
        if (missingProfileIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, first_name, last_name")
            .in("id", missingProfileIds);
          for (const p of profiles ?? []) {
            profileMap[p.id] = `${p.first_name} ${p.last_name}`.trim() || "Campeão";
          }
        }

        for (const reg of winners) {
          if (reg.player_name?.trim()) {
            champMap[reg.tournament_id] = reg.player_name.trim();
          } else if (reg.user_id && profileMap[reg.user_id]) {
            champMap[reg.tournament_id] = profileMap[reg.user_id];
          }
        }
      }
      setChampions(champMap);

      const live = (data as TournamentRow[]).find((t) => t.status === "in-progress");
      if (live) {
        // Initialize timer state from the loaded data
        setLiveBlindIndex(live.current_blind_index ?? 0);
        setLiveTimerRunning(live.timer_running ?? false);
        if (live.timer_running && live.timer_updated_at) {
          const elapsed = Math.floor((Date.now() - new Date(live.timer_updated_at).getTime()) / 1000);
          setLiveTimeLeft(Math.max(0, (live.timer_seconds_left ?? 0) - elapsed));
        } else {
          setLiveTimeLeft(live.timer_seconds_left ?? 0);
        }

        const regs = await fetchTournamentRegistrations(live.id);
        setLiveRegistrations(regs);
        // Set stable ID to trigger realtime subscription
        setLiveTournamentId(live.id);
      }
    }
    setLoading(false);
  }

  async function openTournament(t: TournamentRow) {
    openRequestRef.current = t.id;
    setSelectedTournament(t);
    setInscriptionStep(null);
    setShowWarning(false);
    setCopied(false);
    setRegistrations([]);
    setUserRegistration(null);
    setLoadingRegistrations(true);

    try {
      const regs = await fetchTournamentRegistrations(t.id);
      // Ignora respostas fora de ordem (usuário já abriu outro torneio)
      if (openRequestRef.current !== t.id) return;

      setRegistrations(regs);
      if (user) {
        const myReg = regs.find((r) => r.user_id === user.id);
        setUserRegistration(myReg ?? null);
      } else {
        setUserRegistration(null);
      }
    } finally {
      if (openRequestRef.current === t.id) setLoadingRegistrations(false);
    }
  }

  async function handleRegister() {
    if (!user || !selectedTournament) return;

    const { data: existingRegistration, error: existingError } = await supabase
      .from("tournament_registrations")
      .select("id, status")
      .eq("tournament_id", selectedTournament.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) {
      toast.error("Não foi possível verificar sua inscrição.");
      return;
    }

    if (existingRegistration) {
      toast.info(
        existingRegistration.status === "confirmed"
          ? "Você já está confirmado neste torneio."
          : "Você já está inscrito e aguarda aprovação.",
      );
      await openTournament(selectedTournament);
      return;
    }

    const { error } = await supabase.from("tournament_registrations").insert({
      tournament_id: selectedTournament.id,
      user_id: user.id,
      status: "pending" as any,
    });
    if (error) {
      toast.error(error.message || "Erro ao se inscrever. Tente novamente.");
      return;
    }
    setInscriptionStep("done");
    await openTournament(selectedTournament);
  }

  function copyPix() {
    navigator.clipboard.writeText(PIX_KEY);
    setCopied(true);
    toast.success("Chave PIX copiada!");
    setTimeout(() => setCopied(false), 3000);
  }

  // Helper to optimistically update a live registration
  function updateLiveReg(regId: string, patch: Partial<TournamentRegistration>) {
    setLiveRegistrations((prev) =>
      prev.map((r) => (r.id === regId ? { ...r, ...patch } : r))
    );
  }

  // Admin: eliminate player
  async function eliminatePlayer(reg: TournamentRegistration) {
    updateLiveReg(reg.id, { status: "eliminated" });
    const { error } = await supabase.from("tournament_registrations")
      .update({ status: "eliminated" })
      .eq("id", reg.id);
    if (error) {
      toast.error("Erro ao eliminar");
      updateLiveReg(reg.id, { status: "confirmed" }); // rollback
      return;
    }
    toast.success(`${getRegistrationName(reg)} eliminado`);
  }

  // Admin: reentry player
  // Subtracts current stack from total, adds reentry_stack to total and player
  async function reentryPlayer(reg: TournamentRegistration, tournament: TournamentRow) {
    const currentStack = reg.stack ?? 0;
    const reentryStack = tournament.reentry_stack || 3500;
    const newCount = (reg.reentry_count || 0) + 1;

    // Calculate new total_chips_override: subtract old stack, add reentry stack
    // We need to compute current effective total first
    const allActive = liveRegistrations.filter((r) => r.status === "confirmed" || r.status === "eliminated");
    const currentCalculated = allActive.length * (tournament.initial_stack || 5000) +
      liveRegistrations.reduce((sum, r) => sum + (r.reentry_count || 0) * (tournament.reentry_stack || 3500), 0);
    const currentTotal = tournament.total_chips_override ?? currentCalculated;
    const newTotal = currentTotal - currentStack + reentryStack;

    updateLiveReg(reg.id, { status: "confirmed", stack: reentryStack, reentry_count: newCount });

    const { error } = await supabase.from("tournament_registrations")
      .update({
        status: "confirmed",
        stack: reentryStack,
        reentry_count: newCount,
      })
      .eq("id", reg.id);
    if (error) {
      toast.error("Erro na reentrada");
      updateLiveReg(reg.id, { status: reg.status, stack: reg.stack, reentry_count: reg.reentry_count });
      return;
    }

    // Update total_chips_override
    await supabase.from("tournaments")
      .update({ total_chips_override: newTotal } as any)
      .eq("id", tournament.id);
    setTournaments(prev => prev.map(t => t.id === tournament.id ? { ...t, total_chips_override: newTotal } : t));

    toast.success(`${getRegistrationName(reg)} reentrou com ${reentryStack} fichas (−${currentStack} +${reentryStack})`);
  }

  // Save stack for a player
  async function saveStack(regId: string) {
    const val = parseInt(editingStackValue);
    if (isNaN(val) || val < 0) {
      toast.error("Valor inválido");
      return;
    }
    const prevStack = liveRegistrations.find((r) => r.id === regId)?.stack;
    updateLiveReg(regId, { stack: val });
    setEditingStackId(null);
    setEditingStackValue("");
    const { error } = await supabase.from("tournament_registrations")
      .update({ stack: val })
      .eq("id", regId);
    if (error) {
      toast.error("Erro ao atualizar stack");
      console.error("Stack update error:", error);
      updateLiveReg(regId, { stack: prevStack }); // rollback
      return;
    }
    toast.success("Stack atualizado!");
  }

  const upcoming = tournaments.filter((t) => t.status !== "finished");
  const past = tournaments.filter((t) => t.status === "finished");
  const inProgress = tournaments.find((t) => t.status === "in-progress");
  const nextTournament = upcoming.find((t) => t.status !== "in-progress") ?? upcoming[0];
  const isFinished = selectedTournament?.status === "finished";

  const visibleRegistrations = isFinished
    ? registrations
    : isAdmin
      ? registrations.filter((r) => r.status === "confirmed" || r.status === "pending")
      : registrations.filter((r) => r.status === "confirmed");

  // Live tournament calculations
  const confirmedLive = liveRegistrations.filter((r) => r.status === "confirmed");
  const eliminatedLive = liveRegistrations.filter((r) => r.status === "eliminated");
  const currentBlind = blindStructure[liveBlindIndex] ?? blindStructure[0];
  const isBreak = currentBlind?.isBreak === true;
  const isLateRegistrationOpen = liveBlindIndex < LATE_REGISTRATION_END_INDEX;

  // Calculate total chips in tournament: count ALL non-pending players (confirmed + eliminated)
  // because eliminated players' chips are transferred to others, not removed
  const allActivePlayers = liveRegistrations.filter((r) => r.status === "confirmed" || r.status === "eliminated");
  const calculatedTotalChips = inProgress
    ? allActivePlayers.length * (inProgress.initial_stack || 5000) +
      liveRegistrations.reduce((sum, r) => sum + (r.reentry_count || 0) * (inProgress.reentry_stack || 3500), 0)
    : 0;

  const totalChipsInTournament = inProgress?.total_chips_override ?? calculatedTotalChips;

  // Stack calculations
  const getPlayerStack = (r: TournamentRegistration) => r.stack ?? (inProgress?.initial_stack || 5000);
  const avgStack = confirmedLive.length > 0 ? Math.round(totalChipsInTournament / confirmedLive.length) : 0;
  const maxStack = confirmedLive.length > 0 ? Math.max(...confirmedLive.map(getPlayerStack)) : 0;

  // Sum of all player stacks for error checking
  const sumOfStacks = confirmedLive.reduce((sum, r) => sum + getPlayerStack(r), 0);
  const stackMismatch = isBreak && sumOfStacks !== totalChipsInTournament;

  // Can the current user edit a given player's stack?
  // Admins can edit at any time, players only during breaks
  const isTimerPaused = !liveTimerRunning;
  function canEditStack(reg: TournamentRegistration) {
    if (isAdmin) return true;
    if (isBreak && user && reg.user_id === user.id) return true;
    return false;
  }

  // Current big blind for BB calculations
  // During breaks, use the next level's big blind
  const bbForCalculation = (() => {
    if (currentBlind?.isBreak) {
      const nextNonBreak = blindStructure.slice(liveBlindIndex + 1).find(b => !b.isBreak);
      return nextNonBreak?.bigBlind ?? 0;
    }
    return currentBlind?.bigBlind ?? 0;
  })();

  return (
    <div className="min-h-screen pb-20 md:pb-10">
      <div className="container py-6 md:py-10 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
            Torneios
          </h1>
        </motion.div>

        {loading && (
          <div className="space-y-4" aria-busy="true">
            <div className="rounded-lg border-2 border-accent/30 bg-card p-5 animate-pulse">
              <div className="h-3 w-32 rounded bg-muted mb-3" />
              <div className="h-6 w-2/3 rounded bg-muted mb-4" />
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="h-4 rounded bg-muted" />
                <div className="h-4 rounded bg-muted" />
              </div>
              <div className="h-11 w-full rounded-lg bg-muted" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4 animate-pulse">
                <div className="h-4 w-1/2 rounded bg-muted mb-3" />
                <div className="h-3 w-1/3 rounded bg-muted" />
              </div>
            ))}
          </div>
        )}

        {/* Next tournament highlight */}
        {!loading && nextTournament && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-lg border border-border rail-active bg-card p-5 mb-6 card-lift cursor-pointer"
            onClick={() => openTournament(nextTournament)}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-2">
              Próximo Torneio
            </p>
            <h2 className="font-display text-xl font-bold text-foreground mb-3">
              {nextTournament.name}
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-4 w-4 text-primary" />
                <span>
                  {new Date(nextTournament.date + "T12:00:00").toLocaleDateString("pt-BR")} •{" "}
                  {nextTournament.time?.slice(0, 5)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <DollarSign className="h-4 w-4 text-primary" />
                <span>R${nextTournament.buy_in}</span>
              </div>
              {nextTournament.location && (
                <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{nextTournament.location}</span>
                </div>
              )}
            </div>

            {user ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openTournament(nextTournament);
                }}
                className="flex items-center justify-center gap-2 w-full rounded-lg bg-accent px-4 py-3 font-display text-sm font-semibold text-accent-foreground transition-all hover:scale-[1.02]"
              >
                Ver detalhes
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <Link
                to="/login"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center gap-2 w-full rounded-lg bg-accent px-4 py-3 font-display text-sm font-semibold text-accent-foreground transition-all hover:scale-[1.02]"
              >
                Faça login para se inscrever
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </motion.div>
        )}

        {/* In-progress tournament timer */}
        {!loading && inProgress && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
              <p className="text-xs font-semibold uppercase tracking-widest text-destructive">Ao Vivo</p>
            </div>
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              {inProgress.name}
            </h2>
            <BlindTimer
              blinds={blindStructure}
              initialLevelIndex={inProgress.current_blind_index ?? 0}
              sync={{
                tournamentId: inProgress.id,
                timerRunning: inProgress.timer_running ?? false,
                currentBlindIndex: inProgress.current_blind_index ?? 0,
                timerSecondsLeft: inProgress.timer_seconds_left ?? 0,
                timerUpdatedAt: inProgress.timer_updated_at ?? new Date().toISOString(),
              }}
            />

            {/* Stack mismatch warning */}
            {stackMismatch && (
              <div className="mt-3 rounded-lg bg-destructive/15 border border-destructive/30 p-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <p className="text-sm font-semibold text-destructive">Erro na contagem</p>
              </div>
            )}

            {/* Stack stats */}
            {confirmedLive.length > 0 && (
              <div className="space-y-3 mt-4 mb-3">
                {/* Total chips - editable by admin during breaks */}
                <div className="rounded-lg bg-secondary p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                      <p className="text-xs text-muted-foreground">Total de Fichas</p>
                      {editingTotalChips ? (
                        <div className="flex items-center justify-center gap-2 mt-1">
                          <input
                            type="number"
                            value={editingTotalChipsValue}
                            onChange={(e) => setEditingTotalChipsValue(e.target.value)}
                            className="w-28 rounded border border-input bg-background px-2 py-1 text-sm text-center text-foreground"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const val = parseInt(editingTotalChipsValue);
                                if (!isNaN(val) && val >= 0 && inProgress) {
                                  supabase.from("tournaments").update({ total_chips_override: val } as any).eq("id", inProgress.id).then(({ error }) => {
                                    if (error) { toast.error("Erro ao salvar"); return; }
                                    setTournaments(prev => prev.map(t => t.id === inProgress.id ? { ...t, total_chips_override: val } : t));
                                    toast.success("Total de fichas atualizado!");
                                  });
                                }
                                setEditingTotalChips(false);
                              }
                              if (e.key === "Escape") setEditingTotalChips(false);
                            }}
                          />
                          <button onClick={() => setEditingTotalChips(false)} className="text-muted-foreground hover:text-foreground">
                            <X className="h-4 w-4" />
                          </button>
                          {inProgress?.total_chips_override != null && (
                            <button
                              onClick={() => {
                                if (!inProgress) return;
                                supabase.from("tournaments").update({ total_chips_override: null } as any).eq("id", inProgress.id).then(({ error }) => {
                                  if (error) { toast.error("Erro ao resetar"); return; }
                                  setTournaments(prev => prev.map(t => t.id === inProgress.id ? { ...t, total_chips_override: null } : t));
                                  toast.success("Total de fichas resetado para automático");
                                });
                                setEditingTotalChips(false);
                              }}
                              className="text-xs text-destructive hover:underline"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <p className="text-sm font-bold text-foreground">
                            {totalChipsInTournament.toLocaleString("pt-BR")}
                            {inProgress?.total_chips_override != null && (
                              <span className="text-xs font-normal text-muted-foreground ml-1">(manual)</span>
                            )}
                          </p>
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setEditingTotalChips(true);
                                setEditingTotalChipsValue(String(totalChipsInTournament));
                              }}
                              className="text-muted-foreground hover:text-foreground ml-1"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-secondary p-3 text-center">
                    <p className="text-xs text-muted-foreground">Stack Médio</p>
                    <p className="text-sm font-bold text-foreground">{avgStack.toLocaleString("pt-BR")}</p>
                  </div>
                  <div className="rounded-lg bg-secondary p-3 text-center">
                    <p className="text-xs text-muted-foreground">Maior Stack</p>
                    <p className="text-sm font-bold text-foreground">{maxStack.toLocaleString("pt-BR")}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Player list grouped by table */}
            {confirmedLive.length > 0 && (() => {
              const numTables = inProgress.num_tables ?? 1;
              const tables = Array.from({ length: numTables }, (_, i) => i + 1);
              return (
                <div className="space-y-2 mt-2">
                  <h3 className="font-display text-sm font-semibold text-foreground">
                    Jogadores ({confirmedLive.length})
                  </h3>
                  {tables.map((tableNum) => {
                    const tablePlayers = confirmedLive.filter((r) => r.table_number === tableNum);
                    const unassigned = tableNum === 1 ? confirmedLive.filter((r) => !r.table_number) : [];
                    const allPlayers = [...tablePlayers, ...unassigned];
                    return (
                      <div key={tableNum}>
                        {numTables > 1 && (
                          <p className="text-xs font-semibold text-muted-foreground mb-1 px-1">
                            {inProgress.table_names?.[String(tableNum)]?.trim() || `Mesa ${tableNum}`} ({allPlayers.length})
                          </p>
                        )}
                        <div className="rounded-lg border border-border divide-y divide-border">
                          {allPlayers.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-2">Vazia</p>
                          )}
                          {allPlayers.map((r) => (
                            <div key={r.id} className="flex items-center justify-between px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground">
                                  {getRegistrationInitials(r)}
                                </div>
                                <span className="text-sm text-foreground">{getRegistrationName(r)}</span>
                                {(r.reentry_count || 0) > 0 && (
                                  <span className="text-[10px] font-bold text-accent bg-accent/15 px-1.5 py-0.5 rounded">
                                    {r.reentry_count}R
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                {/* Stack display / edit */}
                                {editingStackId === r.id ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      value={editingStackValue}
                                      onChange={(e) => setEditingStackValue(e.target.value)}
                                      className="w-20 rounded border border-border bg-secondary px-2 py-1 text-xs text-foreground"
                                      autoFocus
                                      onKeyDown={(e) => e.key === "Enter" && saveStack(r.id)}
                                    />
                                    <button onClick={() => saveStack(r.id)} className="text-primary">
                                      <Check className="h-3.5 w-3.5" />
                                    </button>
                                    <button onClick={() => setEditingStackId(null)} className="text-muted-foreground">
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      if (canEditStack(r)) {
                                        setEditingStackId(r.id);
                                        setEditingStackValue(String(getPlayerStack(r)));
                                      }
                                    }}
                                    className={`text-xs font-semibold ${
                                      canEditStack(r) ? "text-foreground cursor-pointer hover:text-primary" : "text-muted-foreground cursor-default"
                                    }`}
                                  >
                                    {getPlayerStack(r).toLocaleString("pt-BR")}
                                    {bbForCalculation > 0 && (
                                      <span className="text-[10px] font-normal text-muted-foreground ml-1">
                                        ({(getPlayerStack(r) / bbForCalculation) % 1 === 0
                                          ? (getPlayerStack(r) / bbForCalculation)
                                          : (getPlayerStack(r) / bbForCalculation).toFixed(1)} BB)
                                      </span>
                                    )}
                                  </button>
                                )}

                                {/* Admin buttons */}
                                {isAdmin && (
                                  <>
                                    <button
                                      onClick={() => eliminatePlayer(r)}
                                      className="rounded bg-destructive/15 p-1 text-destructive hover:bg-destructive/25"
                                      title="Eliminar"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                    {isLateRegistrationOpen && (
                                      <button
                                        onClick={() => reentryPlayer(r, inProgress)}
                                        className="rounded bg-accent/15 p-1 text-accent hover:bg-accent/25"
                                        title="Reentrada"
                                      >
                                        <span className="text-[10px] font-bold">R</span>
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Eliminated players */}
                  {eliminatedLive.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1 px-1">
                        Eliminados ({eliminatedLive.length})
                      </p>
                      <div className="rounded-lg border border-border divide-y divide-border">
                        {eliminatedLive.map((r) => (
                          <div key={r.id} className="flex items-center justify-between px-3 py-2 opacity-50">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground">
                                {getRegistrationInitials(r)}
                              </div>
                              <span className="text-sm text-foreground line-through">{getRegistrationName(r)}</span>
                              {(r.reentry_count || 0) > 0 && (
                                <span className="text-[10px] font-bold text-accent bg-accent/15 px-1.5 py-0.5 rounded">
                                  {r.reentry_count}R
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {isAdmin && isLateRegistrationOpen && (
                                <button
                                  onClick={() => reentryPlayer(r, inProgress)}
                                  className="rounded bg-accent/15 p-1 text-accent hover:bg-accent/25"
                                  title="Reentrada"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <StackCalculator currentBigBlind={bbForCalculation} />
            {user && <PlayerNotepad tournamentId={inProgress.id} userId={user.id} />}
          </motion.div>
        )}

        {/* Past tournaments */}
        {!loading && past.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="font-display text-lg font-semibold text-foreground mb-3">
              Torneios Anteriores
            </h2>
            <div className="space-y-3">
              {past.map((t) => (
                <div
                  key={t.id}
                  onClick={() => openTournament(t)}
                  className="rounded-lg border border-border bg-card p-4 cursor-pointer card-lift"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-display text-sm font-semibold text-foreground">
                      {t.name}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {new Date(t.date + "T12:00:00").toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {champions[t.id] ? (
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3.5 w-3.5 text-accent" />
                        {champions[t.id]}
                      </span>
                    ) : (
                      <span>{t.total_players ?? "—"} jogadores</span>
                    )}
                    <span>Buy-in: R${t.buy_in}</span>
                    {t.prize_pool && <span>Prize pool: R${t.prize_pool}</span>}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Tournament Detail Dialog */}
      <Dialog open={!!selectedTournament} onOpenChange={() => setSelectedTournament(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          {selectedTournament && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl text-foreground">
                  {selectedTournament.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>
                      {new Date(selectedTournament.date + "T12:00:00").toLocaleDateString("pt-BR")}{" "}
                      • {selectedTournament.time?.slice(0, 5)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span>Buy-in: R${selectedTournament.buy_in}</span>
                  </div>
                  {selectedTournament.location && (
                    <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{selectedTournament.location}</span>
                    </div>
                  )}
                  {selectedTournament.prize_pool && (
                    <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                      <span>Prize pool: R${selectedTournament.prize_pool}</span>
                    </div>
                  )}
                </div>

                {!isFinished && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-secondary p-3">
                      <p className="text-xs text-muted-foreground">Reentrada</p>
                      <p className="text-sm font-semibold text-foreground">
                        R${selectedTournament.reentry_fee} (
                        {selectedTournament.reentry_stack.toLocaleString()} fichas)
                      </p>
                    </div>
                    <div className="rounded-lg bg-secondary p-3">
                      <p className="text-xs text-muted-foreground">Registro Tardio</p>
                      <p className="text-sm font-semibold text-foreground">Até nível 5</p>
                    </div>
                    <div className="rounded-lg bg-secondary p-3">
                      <p className="text-xs text-muted-foreground">Stack Inicial</p>
                      <p className="text-sm font-semibold text-foreground">
                        {selectedTournament.initial_stack.toLocaleString()} fichas
                      </p>
                    </div>
                    <div className="rounded-lg bg-secondary p-3">
                      <p className="text-xs text-muted-foreground">Vagas</p>
                      <p className="text-sm font-semibold text-foreground">
                        {visibleRegistrations.length}/{selectedTournament.max_players}
                      </p>
                    </div>
                  </div>
                )}

                {/* Registrations / Rankings */}
                <div>
                  <h3 className="font-display text-sm font-semibold text-foreground mb-2">
                    {isFinished
                      ? "Ranking"
                      : isAdmin
                        ? `Inscritos (${visibleRegistrations.length})`
                        : `Inscritos Confirmados (${visibleRegistrations.filter(r => r.status === "confirmed").length})`}
                  </h3>

                  {loadingRegistrations ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Carregando inscritos...
                    </p>
                  ) : isFinished ? (
                    <div className="rounded-lg border border-border divide-y divide-border max-h-48 overflow-y-auto">
                      {visibleRegistrations.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum participante
                        </p>
                      )}
                      {[...visibleRegistrations]
                        .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
                        .map((r) => (
                          <div key={r.id} className="flex items-center justify-between px-3 py-2">
                            <div className="flex items-center gap-2">
                              {r.position && (
                                <span className="text-lg">
                                  {r.position === 1 ? "🥇" : r.position === 2 ? "🥈" : r.position === 3 ? "🥉" : `${r.position}º`}
                                </span>
                              )}
                              <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground">
                                {getRegistrationInitials(r)}
                              </div>
                              <span className="text-sm text-foreground">{getRegistrationName(r)}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {visibleRegistrations.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum inscrito confirmado ainda
                        </p>
                      )}
                      {(() => {
                        const numTables = selectedTournament.num_tables ?? 1;
                        if (numTables <= 1) {
                          return (
                            <div className="rounded-lg border border-border divide-y divide-border">
                              {visibleRegistrations.map((r) => (
                                   <div key={r.id} className={`flex items-center gap-2 px-3 py-2 ${r.status === "pending" ? "opacity-60" : ""}`}>
                                    <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground">
                                      {getRegistrationInitials(r)}
                                    </div>
                                    <span className="text-sm text-foreground">{getRegistrationName(r)}</span>
                                    {r.status === "pending" && (
                                      <span className="text-[10px] font-semibold text-yellow-500 bg-yellow-500/15 px-1.5 py-0.5 rounded">Pendente</span>
                                    )}
                                  </div>
                              ))}
                            </div>
                          );
                        }
                        return Array.from({ length: numTables }, (_, i) => i + 1).map((tableNum) => {
                          const tablePlayers = visibleRegistrations.filter(r => r.table_number === tableNum);
                          const unassigned = tableNum === 1 ? visibleRegistrations.filter(r => !r.table_number) : [];
                          const allPlayers = [...tablePlayers, ...unassigned];
                          return (
                            <div key={tableNum}>
                              <p className="text-xs font-semibold text-muted-foreground mb-1 px-1">
                                {selectedTournament.table_names?.[String(tableNum)]?.trim() || `Mesa ${tableNum}`} ({allPlayers.length})
                              </p>
                              <div className="rounded-lg border border-border divide-y divide-border">
                                {allPlayers.length === 0 && (
                                  <p className="text-xs text-muted-foreground text-center py-2">Vazia</p>
                                )}
                                {allPlayers.map((r) => (
                                  <div key={r.id} className="flex items-center gap-2 px-3 py-2">
                                    <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground">
                                      {getRegistrationInitials(r)}
                                    </div>
                                    <span className="text-sm text-foreground">{getRegistrationName(r)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>

                {/* Inscription flow */}
                {!isFinished && user && !userRegistration && !inscriptionStep && (
                  <button
                    onClick={() => setInscriptionStep("confirm")}
                    className="flex items-center justify-center gap-2 w-full rounded-lg bg-accent px-4 py-3 font-display text-sm font-semibold text-accent-foreground transition-all hover:scale-[1.02]"
                  >
                    Inscrever-se
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}

                {/* Already registered message */}
                {!isFinished && user && userRegistration && !inscriptionStep && (
                  <div className="rounded-lg bg-secondary p-4 text-center">
                    <p className="text-sm font-semibold text-foreground">Você já está inscrito!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Status:{" "}
                      <span
                        className={
                          userRegistration.status === "confirmed"
                            ? "text-green-500 font-semibold"
                            : "text-yellow-500 font-semibold"
                        }
                      >
                        {userRegistration.status === "confirmed"
                          ? "Confirmado ✓"
                          : "Aguardando aprovação"}
                      </span>
                    </p>
                  </div>
                )}

                {/* Step: Confirm inscription */}
                {inscriptionStep === "confirm" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-border bg-card p-5 space-y-4"
                  >
                    <h3 className="font-display text-base font-semibold text-foreground">
                      Pagamento via PIX
                    </h3>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Valor do Buy-in</p>
                      <p className="font-data text-3xl font-bold text-gold mb-4">
                        R$35,00
                      </p>
                    </div>
                    <div className="rounded-lg bg-secondary p-4">
                      <p className="text-xs text-muted-foreground mb-1">Chave PIX (Aleatória)</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-mono font-semibold text-foreground flex-1 break-all">
                          {PIX_KEY}
                        </p>
                        <button
                          onClick={copyPix}
                          className="shrink-0 rounded-md bg-primary/15 p-2 text-primary hover:bg-primary/25 transition-colors"
                        >
                          {copied ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Envie o comprovante para o organizador do torneio.
                    </p>
                    <button
                      onClick={() => {
                        setInscriptionStep("payment");
                        handleRegister();
                      }}
                      className="w-full rounded-lg bg-primary px-4 py-3 font-display text-sm font-semibold text-primary-foreground transition-all hover:scale-[1.02]"
                    >
                      Já efetuei o pagamento
                    </button>
                  </motion.div>
                )}

                {/* Step: Done */}
                {(inscriptionStep === "payment" || inscriptionStep === "done") && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-lg border border-border bg-card p-5 text-center"
                  >
                    <Check className="h-12 w-12 text-primary mx-auto mb-3" />
                    <h3 className="font-display text-lg font-bold text-foreground mb-1">
                      Inscrição Realizada!
                    </h3>
                    <p className="text-sm text-muted-foreground mb-1">
                      Status:{" "}
                        <span className="font-semibold text-accent">Aguardando aprovação</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Você será notificado assim que o organizador confirmar seu pagamento.
                    </p>
                  </motion.div>
                )}

                {!isFinished && !user && (
                  <Link
                    to="/login"
                    onClick={() => setSelectedTournament(null)}
                    className="flex items-center justify-center gap-2 w-full rounded-lg bg-accent px-4 py-3 font-display text-sm font-semibold text-accent-foreground transition-all hover:scale-[1.02]"
                  >
                    Faça login para se inscrever
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
