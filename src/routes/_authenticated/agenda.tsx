import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, Plus, Building2, StickyNote, Flag, CalendarClock, Check, Eye, Footprints, Trash2, Pencil, Zap, ArrowRight, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { notificarPessoas } from "@/lib/telegram.functions";
import { usePessoaAtual } from "@/lib/pessoa-atual";
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
  respostas?: { de: string; texto: string; em: string }[];
};
type Form = Omit<Tarefa, "id" | "concluida_em" | "created_at" | "respostas"> & { id?: string };
const vazio: Form = { titulo: "", descricao: "", edificio_id: null, de_pessoa: "Dina", para_pessoa: "Leonor", estado: "pendente", prioridade: false, prazo: null };

function AgendaPage() {
  const qc = useQueryClient();
  const [pessoa, setPessoa] = useState<string>("todos");
  const [vista, setVista] = useState<"abertas" | "concluidas">("abertas");
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; pessoas: string[]; tarefaId: string | null } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const notificar = useServerFn(notificarPessoas);
  const [eu] = usePessoaAtual();
  const [resp, setResp] = useState<Record<string, string>>({});

  const { data: tarefas = [] } = useQuery({
    queryKey: ["tarefas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tarefas").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Tarefa[];
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

  // Cada pessoa vê apenas as tarefas em que está envolvida (pede ou recebe).
  const envolvida = (t: Tarefa, p: string | null) => !p || t.de_pessoa === p || t.para_pessoa === p;
  const lista = useMemo(() => tarefas.filter((t) =>
    (vista === "concluidas" ? t.estado === "concluida" : t.estado !== "concluida") &&
    envolvida(t, eu) &&
    (pessoa === "todos" || t.para_pessoa === pessoa || t.de_pessoa === pessoa) &&
    (!q || `${t.titulo} ${t.descricao ?? ""} ${nomeEd(t.edificio_id)}`.toLowerCase().includes(q.toLowerCase()))
  ).sort((a, b) => Number(b.prioridade) - Number(a.prioridade) || (a.prazo ?? "9").localeCompare(b.prazo ?? "9")), [tarefas, vista, pessoa, q, eu, eds]);

  const contagem = (p: string) => tarefas.filter((t) => t.estado !== "concluida" && envolvida(t, eu) && (t.para_pessoa === p || t.de_pessoa === p)).length;

  async function responder(t: Tarefa) {
    const texto = (resp[t.id] ?? "").trim();
    if (!eu || !texto) return;
    const respostas = [...(t.respostas ?? []), { de: eu, texto, em: new Date().toISOString() }];
    const { error } = await supabase.from("tarefas").update({ respostas }).eq("id", t.id);
    if (error) return toast.error(error.message);
    setResp({ ...resp, [t.id]: "" });
    qc.invalidateQueries({ queryKey: ["tarefas"] });
  }

  async function mudarEstado(t: Tarefa, estado: string) {
    const { error } = await supabase.from("tarefas").update({ estado, concluida_em: estado === "concluida" ? new Date().toISOString() : null }).eq("id", t.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["tarefas"] });
  }
  async function guardar() {
    if (!form || !form.titulo.trim()) return toast.error("Escreve o que é preciso fazer");
    const { id, ...rest } = form;
    const r = id
      ? await supabase.from("tarefas").update(rest).eq("id", id).select("id").single()
      : await supabase.from("tarefas").insert(rest).select("id").single();
    if (r.error) return toast.error(r.error.message);
    toast.success(id ? "Tarefa atualizada" : "Tarefa criada");
    const texto = `📋 ${id ? "Tarefa atualizada" : "Nova tarefa"}${rest.prioridade ? " ⚡URGENTE" : ""}\n${rest.titulo}${rest.edificio_id ? `\nPrédio: ${nomeEd(rest.edificio_id)}` : ""}\n${rest.de_pessoa} → ${rest.para_pessoa}${rest.prazo ? `\nAté ${new Date(rest.prazo + "T12:00:00").toLocaleDateString("pt-PT")}` : ""}${rest.descricao ? `\n\n${rest.descricao}` : ""}`;
    setAviso({ texto, pessoas: [rest.para_pessoa], tarefaId: (r.data as { id: string } | null)?.id ?? id ?? null });
    setForm(null);
    qc.invalidateQueries({ queryKey: ["tarefas"] });
  }
  // Guarda na tarefa as pessoas escolhidas para os avisos diários do Telegram.
  async function guardarAvisarPessoas(pessoas: string[]) {
    if (!aviso?.tarefaId) return;
    await supabase.from("tarefas").update({ avisar_pessoas: pessoas }).eq("id", aviso.tarefaId);
  }
  async function enviarAviso() {
    if (!aviso || !aviso.pessoas.length) return toast.error("Escolhe pelo menos uma pessoa");
    setEnviando(true);
    try {
      await guardarAvisarPessoas(aviso.pessoas);
      const r = await notificar({ data: aviso });
      if (r.enviados.length) toast.success(`Aviso enviado a ${r.enviados.join(", ")}`);
      if (r.falhas.length) toast.error(`Não foi possível avisar: ${r.falhas.join(", ")}`);
      setAviso(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao enviar"); }
    finally { setEnviando(false); }
  }
  async function naoAvisar() {
    await guardarAvisarPessoas([]);
    setAviso(null);
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
          <p className="text-sm text-muted-foreground">{eu ? <>Estás no espaço da <span className="font-medium text-foreground">{eu}</span> — só vês os pedidos em que estás envolvida(o).</> : "Escolhe quem és no menu para ver o teu espaço."}</p>
        </div>
        <Button size="lg" className="rounded-full shadow-sm" onClick={() => setForm({ ...vazio })}><Plus className="mr-1 h-4 w-4" /> Nova tarefa</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <button onClick={() => setPessoa("todos")} className={`rounded-2xl border p-4 text-left transition hover:shadow-md ${pessoa === "todos" ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card"}`}>
          <div className="text-xs text-muted-foreground">{eu ? `Espaço da ${eu}` : "Toda a equipa"}</div>
          <div className="mt-1 text-2xl font-semibold">{tarefas.filter((t) => t.estado !== "concluida" && envolvida(t, eu)).length}</div>
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
              {(t.respostas ?? []).length > 0 && (
                <div className="mt-3 space-y-2 border-l-2 border-primary/30 pl-3">
                  {(t.respostas ?? []).map((r, i) => (
                    <div key={i} className="text-sm">
                      <span className={`mr-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${COR[r.de] ?? "bg-muted"}`}>{r.de}</span>
                      <span className="text-[11px] text-muted-foreground">{new Date(r.em).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })}</span>
                      <p className="mt-0.5 whitespace-pre-wrap">{r.texto}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <Input value={resp[t.id] ?? ""} onChange={(e) => setResp({ ...resp, [t.id]: e.target.value })} onKeyDown={(e) => e.key === "Enter" && responder(t)} placeholder={eu ? `Responder como ${eu}…` : "Escolhe quem és no menu para responder"} disabled={!eu} className="h-9 rounded-full text-sm" />
                <Button size="icon" className="h-9 w-9 shrink-0 rounded-full" disabled={!eu || !(resp[t.id] ?? "").trim()} onClick={() => responder(t)}><Send className="h-4 w-4" /></Button>
              </div>
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
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-xl">
          <div className="border-b bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pb-5 pt-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary">Agenda da equipa</p>
            <DialogHeader><DialogTitle className="text-xl">{form?.id ? "Editar pedido" : "Novo pedido"}</DialogTitle></DialogHeader>
            <p className="mt-1 text-sm text-muted-foreground">Diz o que é preciso, para quem e em que prédio.</p>
          </div>
          {form && (
            <div className="max-h-[65vh] space-y-6 overflow-y-auto px-6 py-5">
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">O que é preciso fazer</Label>
                <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex.: Fazer ata da assembleia" className="h-12 rounded-xl text-base" autoFocus />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quem pede e para quem</Label>
                <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 rounded-2xl border bg-muted/30 p-3">
                  {(["de_pessoa", "para_pessoa"] as const).map((k, i) => (
                    <Fragment key={k}>
                      {i === 1 && <ArrowRight className="mt-9 h-4 w-4 text-muted-foreground" />}
                      <div className="space-y-2">
                        <div className="text-[11px] text-muted-foreground">{k === "de_pessoa" ? "Pedido por" : "Para"}</div>
                        <div className="flex flex-col gap-1.5">
                          {PESSOAS.map((p) => (
                            <button type="button" key={p} onClick={() => setForm({ ...form, [k]: p })} className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-sm transition ${form[k] === p ? "border-primary bg-background font-medium shadow-sm ring-1 ring-primary" : "border-transparent text-muted-foreground hover:bg-background"}`}>
                              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${COR[p]}`}>{p[0]}</span>{p}
                            </button>
                          ))}
                        </div>
                      </div>
                    </Fragment>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"><Building2 className="h-3.5 w-3.5" />Prédio</Label>
                <Select value={form.edificio_id ?? "nenhum"} onValueChange={(v) => setForm({ ...form, edificio_id: v === "nenhum" ? null : v })}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Sem prédio</SelectItem>
                    {eds.map((e) => <SelectItem key={e.id} value={e.id}>{`${e.identificacao_interna ?? ""} ${e.nome}`.trim()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"><StickyNote className="h-3.5 w-3.5" />Notas</Label>
                <Textarea rows={3} value={form.descricao ?? ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex.: falta uma lâmpada no 2.º andar" className="rounded-xl" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"><CalendarClock className="h-3.5 w-3.5" />Prazo</Label>
                  <Input type="date" value={form.prazo ?? ""} onChange={(e) => setForm({ ...form, prazo: e.target.value || null })} className="h-11 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"><Flag className="h-3.5 w-3.5" />Prioridade</Label>
                  <button type="button" onClick={() => setForm({ ...form, prioridade: !form.prioridade })} className={`flex h-11 w-full items-center justify-between rounded-xl border px-3 text-sm transition ${form.prioridade ? "border-destructive/40 bg-destructive/10 font-medium text-destructive" : "text-muted-foreground"}`}>
                    <span className="flex items-center gap-1.5"><Zap className="h-4 w-4" />{form.prioridade ? "Urgente" : "Normal"}</span>
                    <Switch checked={form.prioridade} onCheckedChange={(v) => setForm({ ...form, prioridade: v })} onClick={(e) => e.stopPropagation()} />
                  </button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 border-t bg-muted/30 px-6 py-4">
            {form?.id && <Button variant="ghost" className="mr-auto text-destructive" onClick={() => apagar(form.id!)}><Trash2 className="mr-1 h-4 w-4" />Apagar</Button>}
            <Button variant="outline" className="rounded-full" onClick={() => setForm(null)}>Cancelar</Button>
            <Button className="rounded-full px-6" onClick={guardar}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!aviso} onOpenChange={(o) => !o && setAviso(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-primary" />Avisar no Telegram?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Escolhe quem deve receber este pedido no telemóvel.</p>
          {aviso && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {PESSOAS.map((p) => {
                  const on = aviso.pessoas.includes(p);
                  return (
                    <button key={p} type="button" onClick={() => setAviso({ ...aviso, pessoas: on ? aviso.pessoas.filter((x) => x !== p) : [...aviso.pessoas, p] })} className={`flex flex-col items-center gap-2 rounded-2xl border p-3 transition ${on ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50"}`}>
                      <span className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${COR[p]}`}>{on ? <Check className="h-5 w-5" /> : p[0]}</span>
                      <span className="text-sm font-medium">{p}</span>
                    </button>
                  );
                })}
              </div>
              <pre className="whitespace-pre-wrap rounded-xl bg-muted/50 p-3 font-sans text-xs text-muted-foreground">{aviso.texto}</pre>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-full" onClick={naoAvisar}>Não avisar</Button>
            <Button className="rounded-full" disabled={enviando || !aviso?.pessoas.length} onClick={enviarAviso}><Send className="mr-1 h-4 w-4" />{enviando ? "A enviar…" : "Enviar aviso"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
