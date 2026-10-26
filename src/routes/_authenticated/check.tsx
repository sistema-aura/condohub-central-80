import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, History, ListChecks, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePessoaAtual } from "@/lib/pessoa-atual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/check")({
  head: () => ({
    meta: [
      { title: "Check do dia — Condomínio Dinâmico" },
      { name: "description", content: "Lista de tarefas do dia para ir dando check." },
      { property: "og:title", content: "Check do dia — Condomínio Dinâmico" },
      { property: "og:description", content: "Lista de tarefas do dia para ir dando check." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckPage,
});

type Check = { id: string; pessoa: string; texto: string; feito: boolean; dia: string; created_at: string };

function hojeLisboa() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Lisbon" });
}

function addDias(d: string, n: number) {
  const x = new Date(d + "T12:00:00Z");
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}
const fmtCurto = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-PT", { day: "numeric", month: "short" });

function CheckPage() {
  const qc = useQueryClient();
  const [eu] = usePessoaAtual();
  const [novo, setNovo] = useState("");
  const hoje = hojeLisboa();
  const [dia, setDia] = useState(hoje);
  const [mes, setMes] = useState(hoje.slice(0, 7));
  const pessoa = eu ?? "Leonor";

  const { data: todos = [] } = useQuery({
    queryKey: ["checks", pessoa],
    queryFn: async () => {
      const { data, error } = await supabase.from("checks").select("*").eq("pessoa", pessoa).order("created_at");
      if (error) throw error;
      return data as Check[];
    },
  });

  const checks = useMemo(() => todos.filter((c) => c.dia === dia), [todos, dia]);
  // Pendentes de dias anteriores passam para hoje
  const atrasados = useMemo(() => (dia === hoje ? todos.filter((c) => c.dia < hoje && !c.feito) : []), [todos, dia, hoje]);
  const estadoDia = useMemo(() => {
    const m = new Map<string, { t: number; f: number }>();
    for (const c of todos) {
      const e = m.get(c.dia) ?? { t: 0, f: 0 };
      e.t++; if (c.feito) e.f++;
      m.set(c.dia, e);
    }
    return m;
  }, [todos]);

  const lista = [...atrasados, ...checks];
  const feitos = lista.filter((c) => c.feito).length;
  const pct = lista.length ? Math.round((feitos / lista.length) * 100) : 0;

  async function adicionar() {
    const texto = novo.trim();
    if (!texto) return;
    const { error } = await supabase.from("checks").insert({ texto, pessoa, dia });
    if (error) return toast.error(error.message);
    setNovo("");
    qc.invalidateQueries({ queryKey: ["checks"] });
  }
  async function alternar(c: Check) {
    await supabase.from("checks").update({ feito: !c.feito }).eq("id", c.id);
    qc.invalidateQueries({ queryKey: ["checks"] });
  }
  async function apagar(id: string) {
    await supabase.from("checks").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["checks"] });
  }
  const irPara = (d: string) => { setDia(d); setMes(d.slice(0, 7)); };

  const dataLonga = new Date(dia + "T12:00:00").toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" });

  // Calendário do mês
  const primeiro = `${mes}-01`;
  const offset = (new Date(primeiro + "T12:00:00Z").getUTCDay() + 6) % 7;
  const nDias = new Date(Date.UTC(+mes.slice(0, 4), +mes.slice(5, 7), 0)).getUTCDate();
  const celulas: (string | null)[] = [...Array(offset).fill(null), ...Array.from({ length: nDias }, (_, i) => addDias(primeiro, i))];
  const nomeMes = new Date(primeiro + "T12:00:00").toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
  const mudaMes = (n: number) => {
    const d = new Date(Date.UTC(+mes.slice(0, 4), +mes.slice(5, 7) - 1 + n, 1));
    setMes(d.toISOString().slice(0, 7));
  };

  const Linha = ({ c, velho }: { c: Check; velho?: boolean }) => (
    <div className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${c.feito ? "bg-muted/40" : velho ? "border-destructive/40 bg-destructive/5" : "bg-background hover:shadow-sm"}`}>
      <button onClick={() => alternar(c)} className="shrink-0 text-primary">
        {c.feito ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6 text-muted-foreground" />}
      </button>
      <span className={`flex-1 text-sm ${c.feito ? "text-muted-foreground line-through" : ""}`}>{c.texto}</span>
      {velho && <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">de {fmtCurto(c.dia)}</span>}
      <button onClick={() => apagar(c.id)} className="shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="mx-auto grid max-w-5xl gap-6 p-4 md:grid-cols-[1fr_300px] md:p-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="icon" className="rounded-full" onClick={() => irPara(addDias(dia, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="text-center">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Check do dia</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight capitalize md:text-3xl">{dataLonga}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Lista da <span className="font-medium text-foreground">{pessoa}</span>
              {dia !== hoje && <> · <button className="font-medium text-primary underline" onClick={() => irPara(hoje)}>voltar a hoje</button></>}
            </p>
          </div>
          <Button variant="outline" size="icon" className="rounded-full" onClick={() => irPara(addDias(dia, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium"><ListChecks className="h-4 w-4 text-primary" />{feitos} de {lista.length} feitos</span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>

          <div className="mt-5 flex gap-2">
            <Input value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && adicionar()}
              placeholder={dia === hoje ? "O que tens de fazer hoje?" : "Apontar para este dia…"} className="h-11 rounded-xl" />
            <Button className="h-11 rounded-xl px-5" onClick={adicionar}><Plus className="mr-1 h-4 w-4" />Adicionar</Button>
          </div>

          {atrasados.length > 0 && (
            <div className="mt-5 space-y-1.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-destructive"><History className="h-3.5 w-3.5" />Ficou para trás ({atrasados.length})</p>
              {atrasados.map((c) => <Linha key={c.id} c={c} velho />)}
            </div>
          )}

          <div className="mt-4 space-y-1.5">
            {atrasados.length > 0 && checks.length > 0 && <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deste dia</p>}
            {lista.length === 0 && (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nada apontado para este dia ✍️</div>
            )}
            {checks.map((c) => <Linha key={c.id} c={c} velho={dia < hoje && !c.feito} />)}
          </div>
        </div>
      </div>

      <aside className="h-fit rounded-2xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => mudaMes(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-semibold capitalize">{nomeMes}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => mudaMes(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
          {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {celulas.map((d, i) => {
            if (!d) return <div key={i} />;
            const e = estadoDia.get(d);
            const cor = !e ? "" : e.f === e.t ? "bg-success/15 text-success font-semibold" : d < hoje ? "bg-destructive/15 text-destructive font-semibold" : "bg-primary/10 text-primary font-semibold";
            return (
              <button key={d} onClick={() => setDia(d)}
                className={`relative aspect-square rounded-lg text-sm transition hover:bg-accent ${cor} ${d === dia ? "ring-2 ring-primary" : ""} ${d === hoje ? "underline underline-offset-4" : ""}`}>
                {+d.slice(8)}
              </button>
            );
          })}
        </div>
        <div className="mt-4 space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-success/40" />Tudo feito</div>
          <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-destructive/40" />Ficou por fazer</div>
          <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-primary/30" />Apontado (por fazer)</div>
        </div>
      </aside>
    </div>
  );
}
