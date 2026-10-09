import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Circle, ListChecks, Plus, Trash2 } from "lucide-react";
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

function CheckPage() {
  const qc = useQueryClient();
  const [eu] = usePessoaAtual();
  const [novo, setNovo] = useState("");
  const hoje = hojeLisboa();
  const pessoa = eu ?? "Leonor";

  const { data: checks = [] } = useQuery({
    queryKey: ["checks", hoje, pessoa],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checks")
        .select("*")
        .eq("dia", hoje)
        .eq("pessoa", pessoa)
        .order("created_at");
      if (error) throw error;
      return data as Check[];
    },
  });

  const feitos = useMemo(() => checks.filter((c) => c.feito).length, [checks]);
  const pct = checks.length ? Math.round((feitos / checks.length) * 100) : 0;

  async function adicionar() {
    const texto = novo.trim();
    if (!texto) return;
    const { error } = await supabase.from("checks").insert({ texto, pessoa, dia: hoje });
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

  const dataLonga = new Date(hoje + "T12:00:00").toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-8">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Check do dia</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight capitalize">{dataLonga}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lista da <span className="font-medium text-foreground">{pessoa}</span> — vai dando check ao longo do dia ✅
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 font-medium"><ListChecks className="h-4 w-4 text-primary" />{feitos} de {checks.length} feitos</span>
          <span className="text-muted-foreground">{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-5 flex gap-2">
          <Input
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
            placeholder="O que tens de fazer hoje?"
            className="h-11 rounded-xl"
            autoFocus
          />
          <Button className="h-11 rounded-xl px-5" onClick={adicionar}><Plus className="mr-1 h-4 w-4" />Adicionar</Button>
        </div>

        <div className="mt-4 space-y-1.5">
          {checks.length === 0 && (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Ainda não tens nada apontado para hoje. Escreve a primeira tarefa em cima ✍️
            </div>
          )}
          {checks.map((c) => (
            <div key={c.id} className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${c.feito ? "bg-muted/40" : "bg-background hover:shadow-sm"}`}>
              <button onClick={() => alternar(c)} className="shrink-0 text-primary">
                {c.feito ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6 text-muted-foreground" />}
              </button>
              <span className={`flex-1 text-sm ${c.feito ? "text-muted-foreground line-through" : ""}`}>{c.texto}</span>
              <button onClick={() => apagar(c.id)} className="shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">A lista recomeça vazia todos os dias — cada dia é um dia 🌅</p>
    </div>
  );
}
