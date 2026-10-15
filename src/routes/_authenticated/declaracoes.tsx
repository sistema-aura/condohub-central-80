import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Printer, Check, Undo2, Trash2, Folder, FolderOpen, X, FileText, Pencil, StickyNote, Send, Building2, Clock3, ChartNoAxesCombined, BadgeCheck, ChevronLeft, ChevronRight, CalendarCheck, Upload, ExternalLink, Loader2, Wallet, Paperclip } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { descarregarDeclaracao } from "@/lib/declaracao-word";

export const Route = createFileRoute("/_authenticated/declaracoes")({
  head: () => ({
    meta: [
      { title: "Declarações de inexistência de dívida — Condomínio Dinâmico" },
      { name: "description", content: "Declarações de não dívida por fazer e feitas, por prédio." },
      { property: "og:title", content: "Declarações de inexistência de dívida" },
      { property: "og:description", content: "Declarações de não dívida por fazer e feitas, por prédio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

type Ed = { id: string; nome: string; identificacao_interna: string | null; morada: string | null; codigo_postal: string | null; localidade: string | null; observacoes: string | null };
type ReconhecimentoEstado = "por_enviar" | "na_solicitadora" | "no_escritorio";
const reconhecimentoLabels: Record<ReconhecimentoEstado, string> = { por_enviar: "Por enviar à solicitadora", na_solicitadora: "Na solicitadora", no_escritorio: "Já no escritório" };
type Dec = { id: string; edificio_id: string; fracao: string | null; proprietario: string | null; nif: string | null; urgente: boolean; reconhecida: boolean; reconhecimento_estado: ReconhecimentoEstado; feita: boolean; feita_em: string | null; observacoes: string | null; created_at: string; quota_mensal: string | null; fundo_reserva: string | null; quota_seguro: string | null; quota_extraordinaria: string | null; pago_solicitadora: boolean; pago_solicitadora_pdf: string | null; pago_nono: boolean; pago_nono_pdf: string | null; pdf_path: string | null; pdf_nome: string | null };

function DecPdf({ dec, onDone }: { dec: Dec; onDone: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function abrir() {
    if (!dec.pdf_path) return;
    const { data, error } = await supabase.storage.from("condominio-docs").createSignedUrl(dec.pdf_path, 300);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  }
  async function escolher(file: File | null) {
    if (!file) return;
    if (file.type && file.type !== "application/pdf") return toast.error("Escolhe um ficheiro PDF.");
    setBusy(true);
    const path = `${dec.edificio_id}/declaracoes/${crypto.randomUUID()}.pdf`;
    const { error: upErr } = await supabase.storage.from("condominio-docs").upload(path, file, { contentType: "application/pdf" });
    if (upErr) { setBusy(false); return toast.error(upErr.message); }
    const { error } = await supabase.from("declaracoes").update({ pdf_path: path, pdf_nome: file.name.slice(0, 200) }).eq("id", dec.id);
    if (error) { await supabase.storage.from("condominio-docs").remove([path]); setBusy(false); return toast.error(error.message); }
    if (dec.pdf_path) await supabase.storage.from("condominio-docs").remove([dec.pdf_path]);
    setBusy(false);
    toast.success("PDF guardado.");
    onDone();
  }
  async function remover() {
    if (!dec.pdf_path || !confirm("Remover o PDF digitalizado?")) return;
    setBusy(true);
    await supabase.from("declaracoes").update({ pdf_path: null, pdf_nome: null }).eq("id", dec.id);
    await supabase.storage.from("condominio-docs").remove([dec.pdf_path]);
    setBusy(false);
    onDone();
  }

  return (
    <div className="decl-pdf">
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { void escolher(e.target.files?.[0] ?? null); e.target.value = ""; }} />
      {dec.pdf_path ? (
        <div className="flex items-center gap-2 rounded-md border p-2">
          <FileText className="size-4 shrink-0 text-primary" />
          <button type="button" className="min-w-0 flex-1 truncate text-left text-sm hover:underline" onClick={abrir} title="Abrir PDF digitalizado">{dec.pdf_nome ?? "Declaração digitalizada.pdf"}</button>
          <Button type="button" variant="ghost" size="icon" onClick={abrir} title="Abrir PDF" aria-label="Abrir PDF digitalizado"><ExternalLink className="size-4" /></Button>
          <Button type="button" variant="ghost" size="icon" disabled={busy} onClick={remover} title="Remover PDF" aria-label="Remover PDF digitalizado"><Trash2 className="size-4" /></Button>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" className="w-full" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}Juntar PDF digitalizado
        </Button>
      )}
    </div>
  );
}

function Page() {
  const qc = useQueryClient();
  const eds = useQuery({
    queryKey: ["edificios", "min"],
    queryFn: async () => {
      const { data, error } = await supabase.from("edificios").select("id,nome,identificacao_interna,morada,codigo_postal,localidade,observacoes").order("identificacao_interna");
      if (error) throw error;
      return data as Ed[];
    },
  });
  const decs = useQuery({
    queryKey: ["declaracoes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("declaracoes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Dec[];
    },
  });
  const edMap = useMemo(() => new Map((eds.data ?? []).map((e) => [e.id, e])), [eds.data]);
  const refresh = () => qc.invalidateQueries({ queryKey: ["declaracoes"] });
  const [pasta, setPasta] = useState<string | null>(null);

  async function upd(id: string, patch: Partial<Dec>) {
    const { error } = await supabase.from("declaracoes").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  }
  async function del(id: string) {
    if (!confirm("Apagar esta declaração?")) return;
    await supabase.from("declaracoes").delete().eq("id", id);
    refresh();
  }

  function listFeitas() {
    const fmt = (s: string) => new Date(s).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
    const rows = (decs.data ?? []).filter((d) => d.feita);
    const groups = new Map<string, Dec[]>();
    rows.forEach((d) => groups.set(d.edificio_id, [...(groups.get(d.edificio_id) ?? []), d]));
    const keys = [...groups.keys()].sort((a, b) => (edMap.get(a)?.identificacao_interna ?? "").localeCompare(edMap.get(b)?.identificacao_interna ?? ""));
    if (!keys.length) return (
      <div className="decl-empty">
        <Folder className="h-5 w-5" />
        <p>Ainda não há declarações feitas — quando marcares «Feita», aparecem aqui.</p>
      </div>
    );
    const aberta = pasta && keys.includes(pasta) ? pasta : null;
    const eAb = aberta ? edMap.get(aberta) : undefined;
    const itAb = aberta ? (groups.get(aberta) ?? []) : [];
    return (
      <div className="space-y-4">
        <div className="decl-folders-bar">
          <span>{keys.length} {keys.length === 1 ? "prédio" : "prédios"}</span>
          <span aria-hidden="true">·</span>
          <span>{rows.length} {rows.length === 1 ? "declaração" : "declarações"} arquivadas</span>
        </div>
        <div className="decl-folders">
          {keys.map((k) => {
            const e = edMap.get(k);
            const items = groups.get(k) ?? [];
            const recN = items.filter((i) => i.reconhecida).length;
            const urgN = items.filter((i) => i.urgente).length;
            const open = k === aberta;
            return (
              <button type="button" key={k} className="decl-folder" data-open={open ? "true" : undefined} aria-expanded={open} onClick={() => setPasta(open ? null : k)}>
                <span className="decl-folder-body">
                  <span className="decl-folder-top">
                    <FolderOpen className={`h-4 w-4 ${open ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="decl-folder-count">{items.length}</span>
                  </span>
                  <span className="decl-folder-num">{e?.identificacao_interna ?? "—"}</span>
                  <span className="decl-folder-name">{e?.nome ?? "Prédio"}</span>
                  {e?.localidade ? <span className="decl-folder-addr">{e.morada ? `${e.morada}, ` : ""}{e.localidade}</span> : null}
                  {(recN > 0 || urgN > 0) ? (
                    <span className="decl-folder-foot">
                      {recN > 0 ? <span className="decl-folder-tag decl-folder-tag--rec">{recN} rec.</span> : null}
                      {urgN > 0 ? <span className="decl-folder-tag decl-folder-tag--urg">{urgN} urg.</span> : null}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
        {aberta ? (
          <section className="decl-folder-open">
            <header className="decl-folder-open-head">
              <span className="decl-num">{eAb?.identificacao_interna ?? "—"}</span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[15px] font-semibold tracking-tight">{eAb?.nome ?? "Prédio"}</h2>
                <p className="truncate text-xs text-muted-foreground">{itAb.length} {itAb.length === 1 ? "declaração feita" : "declarações feitas"}</p>
              </div>
              <Button size="sm" variant="ghost" className="decl-folder-close" onClick={() => setPasta(null)}><X className="h-3.5 w-3.5" />Fechar pasta</Button>
            </header>
            <div className="decl-tiles">
              {itAb.map((d) => (
                <div key={d.id} className={`decl-tile${d.reconhecida ? " decl-tile--recognized" : ""}`}>
                  <div className="text-sm font-semibold">{d.fracao ? `Fração ${d.fracao}` : "Sem fração"}</div>
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">Feita em {fmt(d.feita_em ?? d.created_at)} · {d.proprietario || "—"}{d.nif ? ` · NIF ${d.nif}` : ""}</div>
                  {d.observacoes ? <p className="decl-note"><StickyNote className="mt-px h-3.5 w-3.5 shrink-0" /><span>{d.observacoes}</span></p> : null}
                  <div className="mt-2.5"><DecPdf dec={d} onDone={refresh} /></div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      <Button variant="ghost" aria-pressed={d.urgente} className={`decl-pill${d.urgente ? " decl-pill--urgent" : ""}`} onClick={() => upd(d.id, { urgente: !d.urgente })}>
                        <i />{d.urgente ? "Com urgência" : "Sem urgência"}
                      </Button>
                      <Button variant="ghost" aria-pressed={d.reconhecida} className={`decl-pill${d.reconhecida ? " decl-pill--recognized" : ""}`} onClick={() => upd(d.id, { reconhecida: !d.reconhecida })}>
                        <i />{d.reconhecida ? "Reconhecida" : "Sem reconhecimento"}
                      </Button>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <DecDialog eds={eds.data ?? []} onDone={refresh} dec={d} />
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Descarregar declaração Word" onClick={() => { if (eAb) void descarregarDeclaracao(eAb, d).catch((error: Error) => toast.error(error.message)); }}><Printer className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Voltar a por fazer" onClick={() => upd(d.id, { feita: false, feita_em: null })}><Undo2 className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Apagar" onClick={() => del(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  {d.reconhecida && (
                    <div className="decl-rec-process">
                      <span className="decl-rec-status"><BadgeCheck className="h-3.5 w-3.5 shrink-0" />{reconhecimentoLabels[d.reconhecimento_estado]}</span>
                      {d.reconhecimento_estado === "por_enviar" && <Button size="sm" variant="outline" className="decl-rec-action" onClick={() => upd(d.id, { reconhecimento_estado: "na_solicitadora" })}><Send className="h-3.5 w-3.5" />Marcar envio à solicitadora</Button>}
                      {d.reconhecimento_estado === "na_solicitadora" && <Button size="sm" variant="outline" className="decl-rec-action" onClick={() => upd(d.id, { reconhecimento_estado: "no_escritorio" })}><Building2 className="h-3.5 w-3.5" />Já está no escritório</Button>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  function listPorFazer() {
    const fmt = (s: string) => new Date(s).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
    const rows = (decs.data ?? []).filter((d) => !d.feita);
    const groups = new Map<string, Dec[]>();
    rows.forEach((d) => groups.set(d.edificio_id, [...(groups.get(d.edificio_id) ?? []), d]));
    const keys = [...groups.keys()].sort((a, b) => (edMap.get(a)?.identificacao_interna ?? "").localeCompare(edMap.get(b)?.identificacao_interna ?? ""));
    if (!keys.length) return (
      <div className="decl-empty">
        <Check className="h-5 w-5" />
        <p>Nada por fazer — tudo pronto por agora.</p>
      </div>
    );
    return (
      <div className="space-y-5">
        {keys.map((k) => {
          const e = edMap.get(k);
          const items = groups.get(k) ?? [];
          const urg = items.filter((i) => i.urgente).length;
          return (
            <article key={k} className={`decl-card${urg ? " decl-card--urgent" : ""}`}>
              <div className={`decl-rail${urg ? " decl-rail--urgent" : ""}`} />
              <header className="flex flex-wrap items-center gap-3 px-5 py-4">
                <span className="decl-num">{e?.identificacao_interna ?? "—"}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[15px] font-semibold tracking-tight">{e?.nome ?? "Prédio"}</h2>
                  {e?.localidade ? <p className="truncate text-xs text-muted-foreground">{e.morada ? `${e.morada}, ` : ""}{e.localidade}</p> : null}
                </div>
                <span className="decl-chip">{items.length} {items.length === 1 ? "declaração" : "declarações"}</span>
                <span className="text-sm font-semibold text-primary">{eur(items.reduce((s, d) => s + preco(d), 0))}</span>
              </header>
              <div className="decl-tiles px-5 pb-5">
                {items.map((d) => (
                  <div key={d.id} className={`decl-tile${d.reconhecida ? " decl-tile--recognized" : ""}`}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{d.fracao ? `Fração ${d.fracao}` : "Sem fração"}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">Pedida · {fmt(d.created_at)}</span>
                    </div>
                    {d.observacoes ? <p className="decl-note"><StickyNote className="mt-px h-3.5 w-3.5 shrink-0" /><span>{d.observacoes}</span></p> : null}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        <Button variant="ghost" aria-pressed={d.urgente} className={`decl-pill${d.urgente ? " decl-pill--urgent" : ""}`} onClick={() => upd(d.id, { urgente: !d.urgente })}>
                          <i />{d.urgente ? "Com urgência" : "Sem urgência"}
                        </Button>
                        <Button variant="ghost" aria-pressed={d.reconhecida} className={`decl-pill${d.reconhecida ? " decl-pill--recognized" : ""}`} onClick={() => upd(d.id, { reconhecida: !d.reconhecida })}>
                          <i />{d.reconhecida ? "Reconhecida" : "Sem reconhecimento"}
                        </Button>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <DecDialog eds={eds.data ?? []} onDone={refresh} dec={d} />
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Descarregar declaração Word" onClick={() => { if (e) void descarregarDeclaracao(e, d).catch((error: Error) => toast.error(error.message)); }}><Printer className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Marcar como feita" onClick={() => upd(d.id, { feita: true, feita_em: new Date().toISOString() })}><Check className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Apagar" onClick={() => del(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                    {d.reconhecida && (
                      <div className="decl-rec-process">
                        <span className="decl-rec-status"><BadgeCheck className="h-3.5 w-3.5 shrink-0" />{reconhecimentoLabels[d.reconhecimento_estado]}</span>
                        {d.reconhecimento_estado === "por_enviar" && <Button size="sm" variant="outline" className="decl-rec-action" onClick={() => upd(d.id, { reconhecimento_estado: "na_solicitadora" })}><Send className="h-3.5 w-3.5" />Marcar envio à solicitadora</Button>}
                        {d.reconhecimento_estado === "na_solicitadora" && <Button size="sm" variant="outline" className="decl-rec-action" onClick={() => upd(d.id, { reconhecimento_estado: "no_escritorio" })}><Building2 className="h-3.5 w-3.5" />Já está no escritório</Button>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  const nPor = (decs.data ?? []).filter((d) => !d.feita).length;
  const nFeitas = (decs.data ?? []).length - nPor;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Declarações de inexistência de dívida</h1>
        <DecDialog eds={eds.data ?? []} onDone={refresh} />
      </div>
      <Tabs defaultValue="por">
        <TabsList className="decl-tabs">
          <TabsTrigger className="decl-tab" value="por"><Clock3 className="h-4 w-4" />Por fazer <span className="decl-tab-count">{nPor}</span></TabsTrigger>
          <TabsTrigger className="decl-tab" value="feitas"><Check className="h-4 w-4" />Feitas <span className="decl-tab-count">{nFeitas}</span></TabsTrigger>
          <TabsTrigger className="decl-tab" value="mapa"><ChartNoAxesCombined className="h-4 w-4" />Mapa do mês</TabsTrigger>
        </TabsList>
        <TabsContent value="por">{listPorFazer()}</TabsContent>
        <TabsContent value="feitas">{listFeitas()}</TabsContent>
        <TabsContent value="mapa"><Mapa decs={decs.data ?? []} edMap={edMap} /></TabsContent>
      </Tabs>
    </div>
  );
}

// Preços: cliente (com IVA), solicitadora (base + IVA, só reconhecidas) e parte da Dinâmico.
type Estado = { urgente: boolean; reconhecida: boolean };
const IVA = 1.23;
const preco = (d: Estado) => (d.reconhecida ? (d.urgente ? 67.65 : 55.35) : d.urgente ? 30.75 : 18.45);
const solBase = (d: Estado) => (d.reconhecida ? (d.urgente ? 30 : 25) : 0);
const solicitadora = (d: Estado) => solBase(d) * IVA;
const dinamico = (d: Estado) => preco(d) - solicitadora(d);
const nono = (d: Estado) => dinamico(d) / IVA; // parte da Dinâmico sem IVA
const eur = (n: number) => n.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

function Mapa({ decs, edMap }: { decs: Dec[]; edMap: Map<string, Ed> }) {
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const shift = (delta: number) => {
    const [y, m] = mes.split("-").map(Number);
    setMes(new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7));
  };
  const label = (() => { const s = new Date(`${mes}-01T00:00:00`).toLocaleDateString("pt-PT", { month: "long", year: "numeric" }); return s.charAt(0).toUpperCase() + s.slice(1); })();
  const rows = decs.filter((d) => d.feita && (d.feita_em ?? d.created_at).slice(0, 7) === mes);
  const rec = rows.filter((d) => d.reconhecida);
  const sum = (fn: (d: Dec) => number) => rows.reduce((s, d) => s + fn(d), 0);
  const qc = useQueryClient();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [pdf, setPdf] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const toggleSel = (id: string) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  async function pagar(ids: string[], quem: "solicitadora" | "nono", valor: boolean, file: File | null = null) {
    if (quem === "solicitadora") ids = ids.filter((id) => rows.find((r) => r.id === id)?.reconhecida);
    if (!ids.length) return toast.error("Nenhuma declaração aplicável.");
    setBusy(true);
    try {
      const patch: Partial<Dec> = { [`pago_${quem}`]: valor };
      if (file) {
        const path = `pagamentos-declaracoes/${quem}/${Date.now()}_${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error } = await supabase.storage.from("condominio-docs").upload(path, file, { contentType: file.type || "application/pdf" });
        if (error) throw error;
        (patch as Record<string, unknown>)[`pago_${quem}_pdf`] = path;
      }
      const { error } = await supabase.from("declaracoes").update(patch as never).in("id", ids);
      if (error) throw error;
      toast.success(valor ? `Marcado como pago (${ids.length})` : "Pagamento desmarcado");
      setSel(new Set()); setPdf(null);
      qc.invalidateQueries({ queryKey: ["declaracoes"] });
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function abrirPdf(path: string) {
    const { data, error } = await supabase.storage.from("condominio-docs").createSignedUrl(path, 300);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  }
  const PagoCell = ({ d, quem }: { d: Dec; quem: "solicitadora" | "nono" }) => {
    const pago = quem === "nono" ? d.pago_nono : d.pago_solicitadora;
    const path = quem === "nono" ? d.pago_nono_pdf : d.pago_solicitadora_pdf;
    return (
      <span className="inline-flex items-center gap-1.5">
        <button type="button" disabled={busy} onClick={() => pagar([d.id], quem, !pago)} className={`decl-pay-pill ${pago ? "is-paid" : ""}`} title={pago ? "Clique para desmarcar" : "Clique para marcar como pago"}>
          {pago ? <Check className="h-3 w-3" /> : null}{pago ? "Pago" : "Por pagar"}
        </button>
        {path ? <button type="button" title="Ver comprovativo" onClick={() => abrirPdf(path)} className="text-primary"><FileText className="h-4 w-4" /></button> : null}
      </span>
    );
  };
  const solTotal = sum((d) => (d.reconhecida ? solicitadora(d) : 0));
  const solFalta = sum((d) => (d.reconhecida && !d.pago_solicitadora ? solicitadora(d) : 0));
  const nonoTotal = sum(nono);
  const nonoFalta = sum((d) => (d.pago_nono ? 0 : nono(d)));
  const stats: { label: string; value: string; note?: string }[] = [
    { label: "Feitas", value: String(rows.length), note: rec.length ? `${rec.length} com reconhecimento` : "todas sem reconhecimento" },
    { label: "Faturado (c/ IVA)", value: eur(sum(preco)) },
    { label: "Falta pagar à solicitadora", value: eur(solFalta), note: `pago ${eur(solTotal - solFalta)} de ${eur(solTotal)}` },
    { label: "Falta pagar à Nono", value: eur(nonoFalta), note: `pago ${eur(nonoTotal - nonoFalta)} de ${eur(nonoTotal)}` },
    { label: "IVA (fica p/ Dinâmico)", value: eur(sum((d) => dinamico(d) - nono(d))) },
  ];
  function imprimir() {
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
    const linhas = rows.map((d) => { const e = edMap.get(d.edificio_id); return `<tr><td>${new Date(d.feita_em ?? d.created_at).toLocaleDateString("pt-PT")}</td><td>${esc(`${e?.identificacao_interna ? e.identificacao_interna + " — " : ""}${e?.nome ?? ""}`)}</td><td>${esc(d.fracao || "—")}</td><td>${d.reconhecida ? "Reconhecida" : "Sem reconh."}${d.urgente ? " · Urgente" : ""}</td><td class=n>${eur(preco(d))}</td><td class=n>${d.reconhecida ? eur(solicitadora(d)) : "—"}</td><td>${d.reconhecida ? (d.pago_solicitadora ? "Pago" : "Por pagar") : "—"}</td><td class=n>${eur(nono(d))}</td><td>${d.pago_nono ? "Pago" : "Por pagar"}</td></tr>`; }).join("");
    const w = window.open("", "_blank");
    if (!w) return toast.error("Permita janelas pop-up para imprimir.");
    w.document.write(`<html><head><title>Mapa ${esc(label)}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:20px;margin:0}p{color:#555;margin:4px 0 16px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:5px 7px;text-align:left}th{background:#eef3f9}.n{text-align:right}.r{display:flex;gap:12px;margin:12px 0 18px;flex-wrap:wrap}.r div{border:1px solid #ccc;border-radius:6px;padding:8px 12px;font-size:12px}.r b{display:block;font-size:15px}</style></head><body><h1>Declarações de inexistência de dívida — ${esc(label)}</h1><p>Condomínio Dinâmico · impresso em ${new Date().toLocaleDateString("pt-PT")}</p><div class=r><div>Feitas<b>${rows.length}</b></div><div>Faturado<b>${eur(sum(preco))}</b></div><div>Solicitadora: pago / falta<b>${eur(solTotal - solFalta)} / ${eur(solFalta)}</b></div><div>Nono: pago / falta<b>${eur(nonoTotal - nonoFalta)} / ${eur(nonoFalta)}</b></div></div><table><thead><tr><th>Data</th><th>Prédio</th><th>Fração</th><th>Tipo</th><th class=n>Preço</th><th class=n>Solicitadora</th><th>Pag. solic.</th><th class=n>Nono</th><th>Pag. Nono</th></tr></thead><tbody>${linhas || "<tr><td colspan=9>Sem declarações neste mês.</td></tr>"}</tbody></table><script>onload=()=>print()</script></body></html>`);
    w.document.close();
  }
  return (
    <div className="space-y-5">
      <div className="decl-map-head">
        <div>
          <p className="decl-map-kicker">Mapa do mês</p>
          <div className="decl-map-monthrow">
            <Button size="icon" variant="ghost" className="decl-map-step" aria-label="Mês anterior" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="decl-map-month">{label}</span>
            <Button size="icon" variant="ghost" className="decl-map-step" aria-label="Mês seguinte" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={imprimir}><FileText className="h-4 w-4" /> Imprimir mês</Button>
          <Input type="month" className="decl-map-input w-40" value={mes} onChange={(e) => { if (e.target.value) setMes(e.target.value); }} aria-label="Escolher mês" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="decl-stat">
            <span className="decl-stat-label">{s.label}</span>
            <span className="decl-stat-value">{s.value}</span>
            {s.note ? <span className="decl-stat-note">{s.note}</span> : null}
          </div>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="decl-empty">
          <CalendarCheck className="h-5 w-5" />
          <p>Nenhuma declaração feita em {label}.</p>
        </div>
      ) : (
        <>
        <div className="decl-pay-bar">
          <div className="decl-pay-info">
            <span className="decl-pay-icon"><Wallet className="h-4 w-4" /></span>
            <div>
              <p className="decl-pay-title">Marcar como pago</p>
              <p className="decl-pay-sub">{sel.size ? `${sel.size} declaração(ões) selecionada(s)` : "Seleciona as declarações na tabela abaixo"}</p>
            </div>
          </div>
          <div className="decl-pay-right">
            <label className="decl-pay-file" data-has={pdf ? "1" : "0"}>
              <Paperclip className="h-3.5 w-3.5 shrink-0" />
              <span>{pdf ? pdf.name : "Comprovativo (opcional)"}</span>
              {pdf ? <span role="button" tabIndex={0} className="decl-pay-file-x" title="Remover ficheiro" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPdf(null); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setPdf(null); } }}><X className="h-3.5 w-3.5" /></span> : null}
              <input type="file" accept="application/pdf,image/*" hidden onChange={(e) => setPdf(e.target.files?.[0] ?? null)} aria-label="Comprovativo de pagamento (opcional)" />
            </label>
            <div className="decl-pay-actions">
              <Button size="sm" disabled={!sel.size || busy} onClick={() => pagar([...sel], "solicitadora", true, pdf)}><Building2 className="h-3.5 w-3.5" /> Solicitadora paga</Button>
              <Button size="sm" variant="secondary" disabled={!sel.size || busy} onClick={() => pagar([...sel], "nono", true, pdf)}><Wallet className="h-3.5 w-3.5" /> Nono pago</Button>
            </div>
          </div>
        </div>
        <div className="decl-map-table">
          <table>
            <thead>
              <tr>
                <th><input type="checkbox" aria-label="Selecionar todas" checked={sel.size === rows.length} onChange={(e) => setSel(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} /></th>
                <th>Data</th><th>Prédio</th><th>Fração</th><th>Tipo</th>
                <th className="num">Preço</th><th className="num">Solicitadora (c/ IVA)</th><th className="num">Nono (sem IVA)</th><th className="num">IVA</th><th>Pago solicitadora</th><th>Pago Nono</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => { const e = edMap.get(d.edificio_id); return (
                <tr key={d.id} className={d.reconhecida ? "row-recognized" : undefined}>
                  <td><input type="checkbox" aria-label="Selecionar" checked={sel.has(d.id)} onChange={() => toggleSel(d.id)} /></td>
                  <td className="whitespace-nowrap">{new Date(d.feita_em ?? d.created_at).toLocaleDateString("pt-PT")}</td>
                  <td className="font-medium">{e?.identificacao_interna ? `${e.identificacao_interna} — ` : ""}{e?.nome}</td>
                  <td>{d.fracao || "—"}</td>
                  <td>{d.reconhecida ? "Reconhecida" : "Sem reconhecimento"} · {d.urgente ? "Urgente" : "Normal"}</td>
                  <td className="num">{eur(preco(d))}</td>
                  <td className="num">{d.reconhecida ? eur(solicitadora(d)) : "—"}</td>
                  <td className="num">{eur(nono(d))}</td>
                  <td className="num">{eur(dinamico(d) - nono(d))}</td>
                  <td>{d.reconhecida ? <PagoCell d={d} quem="solicitadora" /> : "—"}</td>
                  <td><PagoCell d={d} quem="nono" /></td>
                </tr>); })}
            </tbody>
            <tfoot>
              <tr className="decl-map-total">
                <td colSpan={5}>Total de {label}</td>
                <td className="num">{eur(sum(preco))}</td>
                <td className="num">{eur(sum(solicitadora))}</td>
                <td className="num">{eur(sum(nono))}</td>
                <td className="num">{eur(sum((d) => dinamico(d) - nono(d)))}</td><td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
        </>
      )}
    </div>
  );
}

function DecSection({ numero, titulo, children }: { numero: string; titulo: string; children: ReactNode }) {
  return (
    <section className="relative pl-11">
      <span className="decl-sheet-num absolute left-0 top-0">{numero}</span>
      <h3 className="mb-4 pt-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-meeting-sheet-primary">{titulo}</h3>
      {children}
    </section>
  );
}

const decLabel = "mb-1.5 block text-xs font-medium text-muted-foreground";

function DecDialog({ eds, onDone, dec }: { eds: Ed[]; onDone: () => void; dec?: Dec }) {
  const [open, setOpen] = useState(false);
  const empty = { edificio_id: "", fracao: "", proprietario: "", nif: "", observacoes: "", urgente: false, reconhecida: false, reconhecimento_estado: "por_enviar" as ReconhecimentoEstado, quota_mensal: "", fundo_reserva: "", quota_seguro: "Nada em vigor", quota_extraordinaria: "Nada em vigor" };
  const fromDec = (d: Dec) => ({ edificio_id: d.edificio_id, fracao: d.fracao ?? "", proprietario: d.proprietario ?? "", nif: d.nif ?? "", observacoes: d.observacoes ?? "", urgente: d.urgente, reconhecida: d.reconhecida, reconhecimento_estado: d.reconhecimento_estado, quota_mensal: d.quota_mensal ?? "", fundo_reserva: d.fundo_reserva ?? "", quota_seguro: d.quota_seguro ?? "", quota_extraordinaria: d.quota_extraordinaria ?? "" });
  const [f, setF] = useState(empty);
  const set = (patch: Partial<typeof empty>) => setF((prev) => ({ ...prev, ...patch }));
  async function save() {
    if (!f.edificio_id) return toast.error("Escolhe o prédio");
    const { error } = dec
      ? await supabase.from("declaracoes").update(f).eq("id", dec.id)
      : await supabase.from("declaracoes").insert({ ...f, created_by: (await supabase.auth.getUser()).data.user?.id });
    if (error) return toast.error(error.message);
    setOpen(false);
    setF(empty);
    onDone();
  }
  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (o) setF(dec ? fromDec(dec) : empty); }}>
      <SheetTrigger asChild>{dec ? <Button size="icon" variant="ghost" title="Editar"><Pencil className="h-4 w-4" /></Button> : <Button className="decl-save"><Plus className="mr-1.5 h-4 w-4" />Nova declaração</Button>}</SheetTrigger>
      <SheetContent side="right" resizable resizeKey="declaracoes" className="decl-sheet flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <header className="decl-sheet-head">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-meeting-sheet-primary">Declaração de inexistência de dívida</p>
          <SheetTitle className="mt-1 text-xl font-semibold tracking-tight">{dec ? "Editar declaração" : "Nova declaração"}</SheetTitle>
          <SheetDescription className="mt-1 text-sm text-muted-foreground">Só o prédio é obrigatório — o resto podes completar mais tarde.</SheetDescription>
        </header>
        <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
          <DecSection numero="01" titulo="Prédio">
            <Select value={f.edificio_id} onValueChange={(v) => set({ edificio_id: v })}>
              <SelectTrigger><SelectValue placeholder="Escolher prédio" /></SelectTrigger>
              <SelectContent>{eds.map((e) => <SelectItem key={e.id} value={e.id}>{e.identificacao_interna ? `${e.identificacao_interna} — ` : ""}{e.nome}</SelectItem>)}</SelectContent>
            </Select>
          </DecSection>
          <DecSection numero="02" titulo="Fração e proprietário">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className={decLabel}>Fração</Label><Input value={f.fracao} onChange={(e) => set({ fracao: e.target.value })} /></div>
              <div><Label className={decLabel}>NIF</Label><Input value={f.nif} onChange={(e) => set({ nif: e.target.value })} /></div>
            </div>
            <div className="mt-3"><Label className={decLabel}>Proprietário</Label><Input value={f.proprietario} onChange={(e) => set({ proprietario: e.target.value })} /></div>
          </DecSection>
          <DecSection numero="03" titulo="Encargos mensais">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><Label className={decLabel}>Quota mensal (€)</Label><Input inputMode="decimal" value={f.quota_mensal} onChange={(e) => set({ quota_mensal: e.target.value })} /></div>
              <div><Label className={decLabel}>Fundo comum de reserva (€)</Label><Input inputMode="decimal" value={f.fundo_reserva} onChange={(e) => set({ fundo_reserva: e.target.value })} /></div>
              <div><Label className={decLabel}>Quota seguro condomínio (€)</Label><Input value={f.quota_seguro} onChange={(e) => set({ quota_seguro: e.target.value })} /></div>
              <div><Label className={decLabel}>Quota extraordinária</Label><Input value={f.quota_extraordinaria} onChange={(e) => set({ quota_extraordinaria: e.target.value })} /></div>
            </div>
          </DecSection>
          <DecSection numero="04" titulo="Estado">
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="ghost" aria-pressed={f.urgente} className={`decl-toggle h-auto whitespace-normal${f.urgente ? " decl-toggle--urgent" : ""}`} onClick={() => set({ urgente: !f.urgente })}>
                <i />
                <div className="min-w-0"><b>{f.urgente ? "Com urgência" : "Sem urgência"}</b><span>{f.urgente ? "Até 5 dias úteis" : "Até 10 dias úteis"}</span></div>
              </Button>
              <Button variant="ghost" aria-pressed={f.reconhecida} className={`decl-toggle h-auto whitespace-normal${f.reconhecida ? " decl-toggle--recognized" : ""}`} onClick={() => set({ reconhecida: !f.reconhecida })}>
                <i />
                <div className="min-w-0"><b>{f.reconhecida ? "Reconhecida" : "Sem reconhecimento"}</b><span>{f.reconhecida ? "Com reconhecimento de assinatura" : "Sem reconhecimento de assinatura"}</span></div>
              </Button>
            </div>
            {f.reconhecida && <div className="mt-4"><Label className={decLabel}>Reconhecimento de assinatura</Label><Select value={f.reconhecimento_estado} onValueChange={(v) => { if (v === "por_enviar" || v === "na_solicitadora" || v === "no_escritorio") set({ reconhecimento_estado: v }); }}><SelectTrigger aria-label="Estado do reconhecimento"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(reconhecimentoLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>}
          </DecSection>
          <DecSection numero="05" titulo="Notas">
            <Textarea rows={3} value={f.observacoes} onChange={(e) => set({ observacoes: e.target.value })} placeholder="Ex.: o cliente pediu para enviar por email; falta o NIF..." />
          </DecSection>
        </div>
        <footer className="decl-foot">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Preço com IVA</div>
            <div className="text-lg font-semibold text-meeting-sheet-primary">{eur(preco(f))}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button className="decl-save" onClick={save}><Check className="mr-1.5 h-4 w-4" />Guardar</Button>
          </div>
        </footer>
      </SheetContent>
    </Sheet>
  );
}

