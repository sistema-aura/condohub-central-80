import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Printer, Check, Undo2, Trash2, Folder } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
type Dec = { id: string; edificio_id: string; fracao: string | null; proprietario: string | null; nif: string | null; urgente: boolean; reconhecida: boolean; feita: boolean; observacoes: string | null; created_at: string };

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

  const list = (feita: boolean) => {
    const rows = (decs.data ?? []).filter((d) => d.feita === feita);
    const groups = new Map<string, Dec[]>();
    rows.forEach((d) => groups.set(d.edificio_id, [...(groups.get(d.edificio_id) ?? []), d]));
    const keys = [...groups.keys()].sort((a, b) => (edMap.get(a)?.identificacao_interna ?? "").localeCompare(edMap.get(b)?.identificacao_interna ?? ""));
    if (!keys.length) return <p className="py-8 text-center text-sm text-muted-foreground">Nada aqui.</p>;
    return (
      <Accordion type="multiple" className="space-y-2">
        {keys.map((k) => {
          const e = edMap.get(k);
          const items = groups.get(k)!;
          const urg = items.filter((i) => i.urgente && !i.feita).length;
          return (
            <AccordionItem key={k} value={k} className="rounded-lg border bg-card px-4">
              <AccordionTrigger>
                <span className="flex items-center gap-2 text-left">
                  <Folder className="h-4 w-4 text-primary" />
                  {e?.identificacao_interna ? `${e.identificacao_interna} — ` : ""}{e?.nome ?? "?"}
                  <Badge variant="secondary">{items.length}</Badge>
                  {urg > 0 && <Badge variant="destructive">{urg} urgente</Badge>}
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-2">
                {items.map((d) => (
                  <div key={d.id} className="flex flex-wrap items-center gap-2 rounded-md border p-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">Fração {d.fracao || "—"} · {d.proprietario || "—"}</div>
                      <div className="text-xs text-muted-foreground">NIF {d.nif || "—"} · {new Date(d.created_at).toLocaleDateString("pt-PT")}{d.observacoes ? ` · ${d.observacoes}` : ""}</div>
                    </div>
                    <Badge variant={d.urgente ? "destructive" : "outline"} className="cursor-pointer" onClick={() => upd(d.id, { urgente: !d.urgente })}>{d.urgente ? "Com urgência" : "Sem urgência"}</Badge>
                    <Badge variant={d.reconhecida ? "default" : "outline"} className="cursor-pointer" onClick={() => upd(d.id, { reconhecida: !d.reconhecida })}>{d.reconhecida ? "Reconhecida" : "Sem reconhecimento"}</Badge>
                    <Button size="icon" variant="ghost" title="Gerar declaração" onClick={() => e && imprimir(e, d)}><Printer className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" title={d.feita ? "Voltar a por fazer" : "Marcar como feita"} onClick={() => upd(d.id, { feita: !d.feita })}>{d.feita ? <Undo2 className="h-4 w-4" /> : <Check className="h-4 w-4" />}</Button>
                    <Button size="icon" variant="ghost" onClick={() => del(d.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    );
  };

  const nPor = (decs.data ?? []).filter((d) => !d.feita).length;
  const nFeitas = (decs.data ?? []).length - nPor;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Declarações de inexistência de dívida</h1>
        <NovaDialog eds={eds.data ?? []} onDone={refresh} />
      </div>
      <Tabs defaultValue="por">
        <TabsList>
          <TabsTrigger value="por">Por fazer ({nPor})</TabsTrigger>
          <TabsTrigger value="feitas">Feitas ({nFeitas})</TabsTrigger>
        </TabsList>
        <TabsContent value="por">{list(false)}</TabsContent>
        <TabsContent value="feitas">{list(true)}</TabsContent>
      </Tabs>
    </div>
  );
}

function NovaDialog({ eds, onDone }: { eds: Ed[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ edificio_id: "", fracao: "", proprietario: "", nif: "", observacoes: "", urgente: false, reconhecida: false });
  async function save() {
    if (!f.edificio_id) return toast.error("Escolhe o prédio");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("declaracoes").insert({ ...f, created_by: u.user?.id });
    if (error) return toast.error(error.message);
    setOpen(false);
    setF({ edificio_id: "", fracao: "", proprietario: "", nif: "", observacoes: "", urgente: false, reconhecida: false });
    onDone();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />Nova declaração</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova declaração</DialogTitle></DialogHeader>
        <Card><CardContent className="space-y-3 pt-4">
          <div><Label>Prédio</Label>
            <Select value={f.edificio_id} onValueChange={(v) => setF({ ...f, edificio_id: v })}>
              <SelectTrigger><SelectValue placeholder="Escolher prédio" /></SelectTrigger>
              <SelectContent>{eds.map((e) => <SelectItem key={e.id} value={e.id}>{e.identificacao_interna ? `${e.identificacao_interna} — ` : ""}{e.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Fração</Label><Input value={f.fracao} onChange={(e) => setF({ ...f, fracao: e.target.value })} /></div>
            <div><Label>NIF</Label><Input value={f.nif} onChange={(e) => setF({ ...f, nif: e.target.value })} /></div>
          </div>
          <div><Label>Proprietário</Label><Input value={f.proprietario} onChange={(e) => setF({ ...f, proprietario: e.target.value })} /></div>
          <div><Label>Notas</Label><Input value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} /></div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm"><Switch checked={f.urgente} onCheckedChange={(v) => setF({ ...f, urgente: v })} />Com urgência</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={f.reconhecida} onCheckedChange={(v) => setF({ ...f, reconhecida: v })} />Reconhecida</label>
          </div>
          <Button className="w-full" onClick={save}>Guardar</Button>
        </CardContent></Card>
      </DialogContent>
    </Dialog>
  );
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);

function imprimir(e: Ed, d: Dec) {
  const hoje = new Date();
  const data = `${hoje.getDate()} de ${MESES[hoje.getMonth()]} de ${hoje.getFullYear()}`;
  const nipc = e.observacoes?.match(/NIPC[:\s]*([\d ]{9,11})/i)?.[1]?.trim() ?? "___________";
  const morada = [e.morada, e.codigo_postal, e.localidade].filter(Boolean).join(" ");
  const L = "_______";
  const html = `<html><head><meta charset="utf-8"><title>Declaração ${esc(e.nome)}</title><style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;line-height:1.6;font-size:14px}h1{text-align:center;font-size:18px}table{width:100%;border-collapse:collapse;margin:16px 0}td,th{border:1px solid #000;padding:6px;text-align:center;font-size:12px}</style></head><body>
<h1>DECLARAÇÃO INEXISTÊNCIA DE DÍVIDA</h1>
<p>Para os devidos efeitos a Administração do Condomínio ${esc(e.nome)}${morada ? " - " + esc(morada) : ""}, com NIPC ${esc(nipc)} declara nos termos da alínea q) do n.º 1 do artigo 1436.º do Código Civil, que o(a) ${esc(d.proprietario || L)} contribuinte nº ${esc(d.nif || L)} proprietário(a) da fração ${esc(d.fracao || L)}, à data de ${data}, apresenta a seguinte situação perante o condomínio:</p>
<p>Tem a sua situação regularizada perante o Condomínio, não sendo devedor de quaisquer encargos até ${data}.</p>
<p>Declaramos ainda a seguinte lista de encargos, de periodicidade mensal a ser paga a dia 8:</p>
<table><tr><th>Identificação da Fração</th><th>Quota (€)</th><th>Fundo Comum de Reserva (€)</th><th>Quota Seguro Condomínio (€)</th><th>Quota Extraordinária</th></tr>
<tr><td contenteditable>${esc(d.fracao || "")}</td><td contenteditable>__,__ €</td><td contenteditable>_,_ €</td><td contenteditable>Nada em vigor</td><td contenteditable>Nada em vigor</td></tr></table>
<p>Setúbal, ${data}</p><br><br><p style="text-align:center">A Administração de Condomínio<br><br><br>_________________________________________</p>
<script>setTimeout(()=>print(),300)</script></body></html>`;
  const w = window.open("", "_blank");
  if (!w) return toast.error("Permite pop-ups para gerar a declaração");
  w.document.write(html);
  w.document.close();
}
