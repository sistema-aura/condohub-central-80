import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Building2, CalendarClock, Check, Eye, Footprints, Trash2, Pencil, Zap, ArrowRight, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda da equipa — Condomínio Dinâmico" },
      { name: "description", content: "Tarefas e notas partilhadas entre a equipa, por prédio." },
      { property: "og:title", content: "Agenda da equipa — Condomínio Dinâmico" },
      { property: "og:description", content: "Tarefas e notas partilhadas entre a equipa, por prédio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgendaPage,
});

const PESSOAS = ["Leonor", "Dina", "Eduardo"] as const;
const ESTADOS = [
  { v: "pendente", label: "Por ver", icon: CalendarClock },
  { v: "visto", label: "Visto", icon: Eye },
  { v: "em_curso", label: "Fui ao prédio", icon: Footprints },
  { v: "concluida", label: "Concluído", icon: Check },
] as const;
const COR: Record<string, string> = {
  Leonor: "bg-primary/15 text-primary",
  Dina: "bg-accent text-accent-foreground",
  Eduardo: "bg-secondary text-secondary-foreground",
};

type Tarefa = {
  id: string; titulo: string; descricao: string | null; edificio_id: string | null;
  de_pessoa: string; para_pessoa: string; estado: string; prioridade: boolean;
  prazo: string | null; concluida_em: string | null; created_at: string;
};
type Form = Omit<Tarefa, "id" | "concluida_em" | "created_at"> & { id?: string };
const vazio: Form = { titulo: "", descricao: "", edificio_id: null, de_pessoa: "Dina", para_pessoa: "Leonor", estado: "pendente", prioridade: false, prazo: null };

function AgendaPage() {
  const qc = useQueryClient();
  const [pessoa, setPessoa] = useState<string>("todos");
  const [vista, setVista] = useState<"abertas" | "concluidas">("abertas");
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Form | null>(null);

  const { data: tarefas = [] } = useQuery({
    queryKey: ["tarefas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tarefas").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tarefa[];
    },
  });
  const { data: eds = [] } = useQuery({
    queryKey: ["edificios-min"],
    queryFn: async () => {
      const { data } = await supabase.from("edificios").select("id,nome,identificacao_interna").order("identificacao_interna");
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase.channel("tarefas-rt").on("postgres_changes", { event: "*", schema: "public", table: "tarefas" }, () => qc.invalidateQueries({ queryKey: ["tarefas"] })).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const nomeEd = (id: string | null) => {
    const e = eds.find((x) => x.id === id);
    return e ? `${e.identificacao_interna ?? ""} ${e.nome}`.trim() : "";
  };

  const lista = useMemo(() => tarefas.filter((t) =>
    (vista === "concluidas" ? t.estado === "concluida" : t.estado !== "concluida") &&
    (pessoa === "todos" || t.para_pessoa === pessoa || t.de_pessoa === pessoa) &&
    (!q || `${t.titulo} ${t.descricao ?? ""} ${nomeEd(t.edificio_id)}`.toLowerCase().includes(q.toLowerCase()))
  ).sort((a, b) => Number(b.prioridade) - Number(a.prioridade) || (a.prazo ?? "9").localeCompare(b.prazo ?? "9")), [tarefas, vista, pessoa, q, eds]);

  const contagem = (p: string) => tarefas.filter((t) => t.para_pessoa === p && t.estado !== "concluida").length;

  async function mudarEstado(t: Tarefa, estado: string) {
    const { error } = await supabase.from("tarefas").update({ estado, concluida_em: estado === "concluida" ? new Date().toISOString() : null }).eq("id", t.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["tarefas"] });
  }
  async function guardar() {
    if (!form || !form.titulo.trim()) return toast.error("Escreve o que é preciso fazer");
    const { id, ...rest } = form;
    const r = id ? await supabase.from("tarefas").update(rest).eq("id", id) : await supabase.from("tarefas").insert(rest);
    if (r.error) return toast.error(r.error.message);
    toast.success(id ? "Tarefa atualizada" : "Tarefa criada");
    setForm(null);
    qc.invalidateQueries({ queryKey: ["tarefas"] });
  }
  async function apagar(id: string) {
    if (!confirm("Apagar esta tarefa?")) return;
    await supabase.from("tarefas").delete().eq("id", id);
    setForm(null);
    qc.invalidateQueries({ queryKey: ["tarefas"] });
  }

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Equipa Dinâmico</p>
          <h1 className="text-3xl font-semibold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground">Pedidos entre a equipa, por prédio. Avisos no Telegram às 10:30, 15:30 e 17:00.</p>
        </div>
        <Button size="lg" className="rounded-full shadow-sm" onClick={() => setForm({ ...vazio })}><Plus className="mr-1 h-4 w-4" /> Nova tarefa</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <button onClick={() => setPessoa("todos")} className={`rounded-2xl border p-4 text-left transition hover:shadow-md ${pessoa === "todos" ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card"}`}>
          <div className="text-xs text-muted-foreground">Toda a equipa</div>
          <div className="mt-1 text-2xl font-semibold">{tarefas.filter((t) => t.estado !== "concluida").length}</div>
          <div className="text-xs text-muted-foreground">por concluir</div>
        </button>
        {PESSOAS.map((p) => (
          <button key={p} onClick={() => setPessoa(p)} className={`rounded-2xl border p-4 text-left transition hover:shadow-md ${pessoa === p ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card"}`}>
            <div className="flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${COR[p]}`}>{p[0]}</span>
              <span className="font-medium">{p}</span>
            </div>
            <div className="mt-2 text-2xl font-semibold">{contagem(p)}</div>
            <div className="text-xs text-muted-foreground">tarefas para fazer</div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border bg-muted/40 p-1">
          {(["abertas", "concluidas"] as const).map((v) => (
            <button key={v} onClick={() => setVista(v)} className={`rounded-full px-4 py-1.5 text-sm transition ${vista === v ? "bg-background font-medium shadow-sm" : "text-muted-foreground"}`}>
              {v === "abertas" ? "Por concluir" : "Concluídas"}
            </button>
          ))}
        </div>
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar tarefa ou prédio…" className="rounded-full pl-9" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {lista.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
            {vista === "abertas" ? "Nada por fazer 🎉" : "Ainda não há tarefas concluídas."}
          </div>
        )}
        {lista.map((t) => {
          const atrasada = t.prazo && t.prazo < hoje && t.estado !== "concluida";
          return (
            <div key={t.id} className={`group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition hover:shadow-md ${t.prioridade ? "border-l-4 border-l-destructive" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {t.prioridade && <Zap className="h-4 w-4 shrink-0 text-destructive" />}
                    <h3 className={`font-semibold leading-snug ${t.estado === "concluida" ? "text-muted-foreground line-through" : ""}`}>{t.titulo}</h3>
                  </div>
                  {t.edificio_id && <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Building2 className="h-3.5 w-3.5" />{nomeEd(t.edificio_id)}</div>}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-60 group-hover:opacity-100" onClick={() => setForm({ ...t })}><Pencil className="h-4 w-4" /></Button>
              </div>
              {t.descricao && <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{t.descricao}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded-full px-2.5 py-1 font-medium ${COR[t.de_pessoa] ?? "bg-muted"}`}>{t.de_pessoa}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className={`rounded-full px-2.5 py-1 font-medium ${COR[t.para_pessoa] ?? "bg-muted"}`}>{t.para_pessoa}</span>
                {t.prazo && <span className={`ml-auto rounded-full px-2.5 py-1 ${atrasada ? "bg-destructive/10 font-medium text-destructive" : "bg-muted text-muted-foreground"}`}>até {new Date(t.prazo + "T12:00:00").toLocaleDateString("pt-PT")}</span>}
              </div>
              <div className="mt-4 grid grid-cols-4 gap-1 rounded-xl bg-muted/50 p-1">
                {ESTADOS.map((s) => {
                  const Icon = s.icon;
                  const ativo = t.estado === s.v;
                  return (
                    <button key={s.v} onClick={() => mudarEstado(t, s.v)} className={`flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] transition ${ativo ? (s.v === "concluida" ? "bg-primary text-primary-foreground shadow-sm" : "bg-background font-medium shadow-sm") : "text-muted-foreground hover:bg-background/60"}`}>
                      <Icon className="h-4 w-4" />{s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{form?.id ? "Editar tarefa" : "Nova tarefa"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="space-y-1.5"><Label>O que é preciso fazer</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex.: Fazer ata da assembleia" /></div>
              <div className="space-y-1.5">
                <Label>Prédio</Label>
                <Select value={form.edificio_id ?? "nenhum"} onValueChange={(v) => setForm({ ...form, edificio_id: v === "nenhum" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Sem prédio</SelectItem>
                    {eds.map((e) => <SelectItem key={e.id} value={e.id}>{`${e.identificacao_interna ?? ""} ${e.nome}`.trim()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(["de_pessoa", "para_pessoa"] as const).map((k) => (
                  <div key={k} className="space-y-1.5">
                    <Label>{k === "de_pessoa" ? "Pedido por" : "Para"}</Label>
                    <Select value={form[k]} onValueChange={(v) => setForm({ ...form, [k]: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PESSOAS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5"><Label>Notas</Label><Textarea rows={3} value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex.: falta uma lâmpada no 2.º andar" /></div>
              <div className="grid grid-cols-2 items-end gap-3">
                <div className="space-y-1.5"><Label>Prazo (opcional)</Label><Input type="date" value={form.prazo ?? ""} onChange={(e) => setForm({ ...form, prazo: e.target.value || null })} /></div>
                <label className="flex h-10 items-center gap-2 text-sm"><Switch checked={form.prioridade} onCheckedChange={(v) => setForm({ ...form, prioridade: v })} /> Urgente</label>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {form?.id && <Button variant="ghost" className="mr-auto text-destructive" onClick={() => apagar(form.id!)}><Trash2 className="mr-1 h-4 w-4" />Apagar</Button>}
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={guardar}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
