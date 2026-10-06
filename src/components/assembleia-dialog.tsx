import { useState, type ReactNode } from "react";
import { Building2, CalendarDays, Clock3, MapPin, FileText, Mail, Send, Plus, Trash2, Upload, ExternalLink, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { estadoAssembleia, fracoesEdificio, lerFracoes, pad, ymd, type Assembleia, type EdificioAssembleia, type FracaoAta } from "@/lib/assembleias";

type Props = { initial: { dia: string; assembleia?: Assembleia }; edificios: EdificioAssembleia[]; onClose: () => void; onSaved: () => Promise<unknown> };
function FichaSection({ numero, titulo, children }: { numero: string; titulo: string; children: ReactNode }) {
  return <section className="relative pl-10 sm:pl-12">
    <span className="assembly-sheet-number absolute left-0 top-0 flex size-8 items-center justify-center border-2 border-meeting-sheet-primary text-xs font-semibold text-meeting-sheet-primary">{numero}</span>
    <h3 className="mb-6 pt-1.5 text-sm font-semibold uppercase text-meeting-sheet-primary">{titulo}</h3>
    {children}
  </section>;
}
export function AssembleiaDialog({ initial, edificios, onClose, onSaved }: Props) {
  const a = initial.assembleia;
  const d = a ? new Date(a.data_hora) : null;
  const [form, setForm] = useState({
    edificio_id: a?.edificio_id ?? "", dia: d ? ymd(d) : initial.dia, hora: d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : "20:00",
    local: a?.local ?? "", observacoes: a?.observacoes ?? "", convocatoria_enviada: a?.convocatoria_enviada ?? false,
    ata_feita: a?.ata_feita ?? false, ata_numero: a?.ata_numero ?? "", ata_data: a?.ata_data ?? "",
  });
  const [fracoes, setFracoes] = useState<FracaoAta[]>(() => {
    const saved = lerFracoes(a?.ata_fracoes);
    return saved.length ? saved : fracoesEdificio(edificios.find((e) => e.id === a?.edificio_id)?.fracoes_ata);
  });
  const [quantidade, setQuantidade] = useState(() => String(edificios.find((e) => e.id === a?.edificio_id)?.quantidade_fracoes ?? ""));
  const [file, setFile] = useState<File | null>(null);
  const [removePdf, setRemovePdf] = useState(false);
  const [busy, setBusy] = useState(false);
  const estado = estadoAssembleia({ ...form, ata_fracoes: fracoes });
  const enviados = fracoes.filter((f) => f.email || f.carta).length;
  const mudarFracao = (i: number, patch: Partial<FracaoAta>) => setFracoes((prev) => prev.map((f, j) => j === i ? { ...f, ...patch } : f));
  const escolherEdificio = (id: string) => {
    setForm({ ...form, edificio_id: id });
    setFracoes(fracoesEdificio(edificios.find((e) => e.id === id)?.fracoes_ata));
    setQuantidade(String(edificios.find((e) => e.id === id)?.quantidade_fracoes ?? ""));
  };
  const gerarFracoes = () => {
    const n = Number(quantidade);
    if (!Number.isInteger(n) || n < 1 || n > 500) return toast.error("Indica entre 1 e 500 frações.");
    if (fracoes.length && !confirm("Substituir a lista de frações e os registos de envio?")) return;
    setFracoes(Array.from({ length: n }, (_, i) => ({ fracao: String(i + 1), email: false, carta: false })));
  };
  const abrirPdf = async () => {
    if (!a?.ata_pdf_path) return;
    const { data, error } = await supabase.storage.from("condominio-docs").createSignedUrl(a.ata_pdf_path, 300);
    if (error) return toast.error("Não foi possível abrir o PDF.");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  const guardar = async () => {
    if (!form.edificio_id || !form.dia || !form.hora) return toast.error("Preenche o prédio, a data e a hora.");
    if (fracoes.some((f) => !f.fracao.trim())) return toast.error("Preenche a identificação de todas as frações.");
    const labels = fracoes.map((f) => f.fracao.trim());
    if (new Set(labels.map((f) => f.toLowerCase())).size !== labels.length) return toast.error("Há frações repetidas.");
    const datetime = new Date(`${form.dia}T${form.hora}`);
    if (Number.isNaN(datetime.getTime())) return toast.error("Data ou hora inválida.");
    setBusy(true);
    let uploaded: string | null = null;
    let persisted = false;
    try {
      let path = removePdf ? null : a?.ata_pdf_path ?? null;
      let name = removePdf ? null : a?.ata_pdf_nome ?? null;
      if (file) {
        uploaded = `${form.edificio_id}/atas/${crypto.randomUUID()}.pdf`;
        const { error } = await supabase.storage.from("condominio-docs").upload(uploaded, file, { contentType: "application/pdf" });
        if (error) throw error;
        path = uploaded; name = file.name.slice(0, 200);
      }
      const row = { edificio_id: form.edificio_id, data_hora: datetime.toISOString(), local: form.local.trim() || null,
        observacoes: form.observacoes.trim() || null, convocatoria_enviada: form.convocatoria_enviada,
        ata_feita: form.ata_feita, ata_numero: form.ata_numero.trim() || null, ata_data: form.ata_data || null,
        ata_fracoes: fracoes.map((f) => ({ ...f, fracao: f.fracao.trim() })), ata_pdf_path: path, ata_pdf_nome: name };
      const { error } = a ? await supabase.from("assembleias").update(row).eq("id", a.id) : await supabase.from("assembleias").insert(row);
      if (error) throw error;
      persisted = true;
      const { error: edError } = await supabase.from("edificios").update({ fracoes_ata: labels }).eq("id", form.edificio_id);
      if (edError) toast.warning("Assembleia guardada; não foi possível guardar as frações para próximas atas.");
      if (a?.ata_pdf_path && a.ata_pdf_path !== path) {
        const { error: cleanupError } = await supabase.storage.from("condominio-docs").remove([a.ata_pdf_path]);
        if (cleanupError) toast.warning("Guardado; não foi possível remover o PDF anterior.");
      }
      await onSaved(); onClose(); toast.success("Assembleia guardada.");
    } catch (e) {
      if (uploaded && !persisted) await supabase.storage.from("condominio-docs").remove([uploaded]);
      toast.error(e instanceof Error ? e.message : "Não foi possível guardar a assembleia.");
    } finally { setBusy(false); }
  };
  const apagar = async () => {
    if (!a || !confirm("Apagar esta assembleia e o PDF da ata?")) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("assembleias").delete().eq("id", a.id);
      if (error) throw error;
      if (a.ata_pdf_path) {
        const { error: pdfError } = await supabase.storage.from("condominio-docs").remove([a.ata_pdf_path]);
        if (pdfError) toast.warning("Assembleia apagada; não foi possível remover o PDF.");
      }
      await onSaved(); onClose(); toast.success("Assembleia apagada.");
    } catch { toast.error("Não foi possível apagar a assembleia."); }
    finally { setBusy(false); }
  };
  return <Sheet open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <SheetContent side="right" aria-describedby={undefined} onEscapeKeyDown={(e) => { if (busy) e.preventDefault(); }} onPointerDownOutside={(e) => { if (busy) e.preventDefault(); }} className="assembly-sheet flex h-dvh w-full flex-col gap-0 rounded-none border-meeting-sheet-border bg-meeting-sheet-surface p-0 sm:max-w-[680px] [&>button]:right-6 [&>button]:top-8">
      <SheetHeader className="shrink-0 border-b border-meeting-sheet-border px-6 py-7 pr-14 text-left sm:px-10 sm:py-8">
        <SheetTitle className="text-2xl font-bold">{a ? "Editar reunião" : "Marcar reunião"}</SheetTitle>
        <div><span className={`inline-flex border px-2 py-0.5 text-xs font-medium ${estado.classe}`}>{estado.label}</span></div>
      </SheetHeader>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-10 sm:py-10">
        <div className="space-y-10 sm:space-y-12">
        <FichaSection numero="01" titulo="Propriedade">
        <div className="space-y-2"><Label htmlFor="ass-edificio" className="flex items-center gap-2"><Building2 className="size-4 text-muted-foreground" />Prédio</Label>
          <select id="ass-edificio" disabled={busy} className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={form.edificio_id} onChange={(e) => escolherEdificio(e.target.value)}>
            <option value="">Escolher prédio…</option>{edificios.map((e) => <option key={e.id} value={e.id}>{e.identificacao_interna ? `${e.identificacao_interna} · ` : ""}{e.nome}</option>)}
           </select></div>
        </FichaSection>
        <div className="h-px bg-meeting-sheet-border" />
        <FichaSection numero="02" titulo="Data e hora">
         <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:gap-6">
          <div className="space-y-2"><Label htmlFor="ass-dia" className="flex gap-2 items-center"><CalendarDays className="size-4 text-muted-foreground" />Data da reunião</Label><Input id="ass-dia" type="date" value={form.dia} onChange={(e) => setForm({ ...form, dia: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="ass-hora" className="flex gap-2 items-center"><Clock3 className="size-4 text-muted-foreground" />Hora</Label><Input id="ass-hora" type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} /></div>
        </div>
        {form.dia && (() => { const dia = new Date(`${form.dia}T00:00:00`); const envio = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() - 15);
           return <div className="mt-6 border-l-4 border-meeting-sheet-primary bg-meeting-sheet-border/30 p-4 text-sm text-meeting-sheet-primary"><div className="capitalize">Reunião: {dia.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })}</div><div className="mt-1 font-semibold">Enviar convocatória: <span>{envio.toLocaleDateString("pt-PT", { day: "numeric", month: "long" })} ({envio.toLocaleDateString("pt-PT", { weekday: "long" })})</span></div></div>; })()}
        </FichaSection>
        <div className="h-px bg-meeting-sheet-border" />
        <FichaSection numero="03" titulo="Logística">
        <div className="space-y-6">
        <div className="space-y-2"><Label htmlFor="ass-local" className="flex items-center gap-2"><MapPin className="size-4 text-muted-foreground" />Local</Label><Input id="ass-local" value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} /></div>
         <div className="space-y-2"><Label htmlFor="ass-notas">Notas</Label><Textarea id="ass-notas" rows={4} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
        </div>
        </FichaSection>
        <div className="h-px bg-meeting-sheet-border" />
        <FichaSection numero="04" titulo="Convocatória">
         <div className="flex items-center justify-between gap-3 border border-meeting-sheet-border bg-meeting-sheet-background p-4 sm:p-6"><Label htmlFor="ass-convocatoria" className="flex gap-2 items-center leading-relaxed"><Send className="size-4 shrink-0 text-meeting-sheet-primary" />Convocatória enviada</Label><Switch id="ass-convocatoria" disabled={busy} checked={form.convocatoria_enviada} onCheckedChange={(v) => setForm({ ...form, convocatoria_enviada: v })} /></div>
        </FichaSection>
        {form.convocatoria_enviada && <>
        <div className="h-px bg-meeting-sheet-border" />
        <FichaSection numero="05" titulo="Ata e documentação">
         <div className="space-y-6">
          <div className="flex items-center justify-between"><Label htmlFor="ass-ata" className="flex gap-2 items-center text-base"><FileText className="size-4 text-meeting-minutes-foreground" />Ata feita</Label><Switch id="ass-ata" checked={form.ata_feita} onCheckedChange={(v) => setForm({ ...form, ata_feita: v, ata_data: v && !form.ata_data ? ymd(new Date()) : form.ata_data })} /></div>
          <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="ata-numero">N.º da ata</Label><Input id="ata-numero" placeholder="Ex.: 24" value={form.ata_numero} onChange={(e) => setForm({ ...form, ata_numero: e.target.value })} /></div><div className="space-y-2"><Label htmlFor="ata-data">Data da ata</Label><Input id="ata-data" type="date" value={form.ata_data} onChange={(e) => setForm({ ...form, ata_data: e.target.value })} /></div></div>
          <div className="space-y-2"><Label htmlFor="ata-pdf">PDF da ata <span className="font-normal text-muted-foreground">(opcional)</span></Label>
            {a?.ata_pdf_path && !removePdf && !file ? <div className="flex items-center gap-2 border rounded-md p-2"><FileText className="size-4 shrink-0 text-primary" /><span className="truncate flex-1 text-sm">{a.ata_pdf_nome ?? "Ata.pdf"}</span><Button type="button" variant="ghost" size="icon" onClick={abrirPdf} title="Abrir PDF" aria-label="Abrir PDF"><ExternalLink className="size-4" /></Button><Button type="button" variant="ghost" size="icon" disabled={busy} onClick={() => setRemovePdf(true)} title="Remover PDF" aria-label="Remover PDF"><Trash2 className="size-4" /></Button></div> : null}
            <div className="flex items-center gap-2"><Upload className="size-4 text-muted-foreground shrink-0" /><Input id="ata-pdf" type="file" accept="application/pdf,.pdf" disabled={busy} onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 20 * 1024 * 1024) { e.target.value = ""; return toast.error("O PDF deve ter até 20 MB."); } const signature = new TextDecoder().decode(await f.slice(0, 5).arrayBuffer()); if (signature !== "%PDF-") { e.target.value = ""; return toast.error("Escolhe um ficheiro PDF válido."); } setFile(f); }} /></div>
            {file && <div className="flex justify-between items-center text-sm"><span className="truncate">{file.name}</span><Button variant="ghost" size="sm" onClick={() => { setFile(null); const input = document.getElementById("ata-pdf"); if (input instanceof HTMLInputElement) input.value = ""; }}>Cancelar anexo</Button></div>}
          </div>
         </div>
        </FichaSection>
        <div className="h-px bg-meeting-sheet-border" />
        <FichaSection numero="06" titulo="Envio da ata">
         <div className="space-y-3">
          <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">Registo de envio da ata</h3><span className="text-xs text-muted-foreground whitespace-nowrap">{enviados} / {fracoes.length} frações</span></div>
          {fracoes.length === 0 && <div className="flex gap-2 items-end"><div className="space-y-2 flex-1"><Label htmlFor="ata-quantidade">Quantidade de frações</Label><Input id="ata-quantidade" type="number" min={1} max={500} placeholder="Ex.: 8" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} /></div><Button variant="outline" onClick={gerarFracoes}>Criar lista</Button></div>}
          {fracoes.length > 0 && <div className="space-y-2"><div className="grid grid-cols-[minmax(0,1fr)_76px_76px_32px] gap-2 text-xs text-muted-foreground"><span>Fração</span><span className="text-center">Email</span><span className="text-center">Carta</span><span /></div>
            {fracoes.map((f, i) => <div key={i} className="grid grid-cols-[minmax(0,1fr)_76px_76px_32px] gap-2 items-center"><Input aria-label={`Fração ${i + 1}`} value={f.fracao} onChange={(e) => mudarFracao(i, { fracao: e.target.value })} /><Button variant={f.email ? "default" : "outline"} className={f.email ? "bg-meeting-sent text-success-foreground hover:bg-meeting-sent/90" : ""} aria-label={`Email da fração ${f.fracao}`} aria-pressed={f.email} disabled={!form.ata_feita} onClick={() => mudarFracao(i, { email: !f.email })}><Mail className="size-4" />{f.email && <Check className="size-3" />}</Button><Button variant={f.carta ? "default" : "outline"} className={f.carta ? "bg-meeting-sent text-success-foreground hover:bg-meeting-sent/90" : ""} aria-label={`Carta da fração ${f.fracao}`} aria-pressed={f.carta} disabled={!form.ata_feita} onClick={() => mudarFracao(i, { carta: !f.carta })}><Send className="size-4" />{f.carta && <Check className="size-3" />}</Button><Button variant="ghost" size="icon" className="size-8" aria-label={`Remover fração ${f.fracao}`} title="Remover fração" onClick={() => setFracoes(fracoes.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button></div>)}
          </div>}
          <Button variant="outline" size="sm" onClick={() => setFracoes([...fracoes, { fracao: "", email: false, carta: false }])}><Plus className="size-4" />Adicionar fração</Button>
         </div>
        </FichaSection>
        </>}
        </div>
      </div>
       <div className="flex shrink-0 gap-3 items-center justify-end border-t border-meeting-sheet-border bg-meeting-sheet-surface px-5 py-5 sm:px-10 sm:py-7">
        {a && <Button variant="ghost" size="icon" className="mr-auto text-destructive" disabled={busy} onClick={apagar} aria-label="Apagar assembleia" title="Apagar assembleia"><Trash2 className="size-4" /></Button>}
         <Button variant="ghost" className="rounded-none px-4 sm:px-6" disabled={busy} onClick={onClose}>Cancelar</Button><Button className="h-11 rounded-none bg-meeting-sheet-primary px-5 text-primary-foreground hover:bg-meeting-sheet-primary/90 sm:px-8" disabled={busy} onClick={guardar}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Guardar</Button>
      </div>
    </SheetContent>
  </Sheet>;
}