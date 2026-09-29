import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Printer, Check, Undo2, Trash2, Folder, Pencil } from "lucide-react";

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
type Dec = { id: string; edificio_id: string; fracao: string | null; proprietario: string | null; nif: string | null; urgente: boolean; reconhecida: boolean; feita: boolean; feita_em: string | null; observacoes: string | null; created_at: string; quota_mensal: string | null; fundo_reserva: string | null; quota_seguro: string | null; quota_extraordinaria: string | null };

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
                    <DecDialog eds={eds.data ?? []} onDone={refresh} dec={d} />
                     <Button size="icon" variant="ghost" title="Descarregar declaração Word" onClick={() => { if (e) void descarregarDeclaracao(e, d).catch((error: Error) => toast.error(error.message)); }}><Printer className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" title={d.feita ? "Voltar a por fazer" : "Marcar como feita"} onClick={() => upd(d.id, { feita: !d.feita, feita_em: d.feita ? null : new Date().toISOString() })}>{d.feita ? <Undo2 className="h-4 w-4" /> : <Check className="h-4 w-4" />}</Button>
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
        <DecDialog eds={eds.data ?? []} onDone={refresh} />
      </div>
      <Tabs defaultValue="por">
        <TabsList>
          <TabsTrigger value="por">Por fazer ({nPor})</TabsTrigger>
          <TabsTrigger value="feitas">Feitas ({nFeitas})</TabsTrigger>
          <TabsTrigger value="mapa">Mapa do mês</TabsTrigger>
        </TabsList>
        <TabsContent value="por">{list(false)}</TabsContent>
        <TabsContent value="feitas">{list(true)}</TabsContent>
        <TabsContent value="mapa"><Mapa decs={decs.data ?? []} edMap={edMap} /></TabsContent>
      </Tabs>
    </div>
  );
}

// Preços: cliente (com IVA), solicitadora (base + IVA, só reconhecidas) e parte da Dinâmico.
const IVA = 1.23;
const preco = (d: Dec) => (d.reconhecida ? (d.urgente ? 67.65 : 55.35) : d.urgente ? 30.75 : 18.45);
const solBase = (d: Dec) => (d.reconhecida ? (d.urgente ? 30 : 25) : 0);
const solicitadora = (d: Dec) => solBase(d) * IVA;
const dinamico = (d: Dec) => preco(d) - solicitadora(d);
const eur = (n: number) => n.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

function Mapa({ decs, edMap }: { decs: Dec[]; edMap: Map<string, Ed> }) {
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const rows = decs.filter((d) => d.feita && (d.feita_em ?? d.created_at).slice(0, 7) === mes);
  const rec = rows.filter((d) => d.reconhecida);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><Label>Mês</Label><Input type="month" className="w-44" value={mes} onChange={(e) => setMes(e.target.value)} /></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Feitas</div><div className="text-2xl font-semibold">{rows.length}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Faturado (c/ IVA)</div><div className="text-2xl font-semibold">{eur(rows.reduce((s, d) => s + preco(d), 0))}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">A pagar à solicitadora ({rec.length})</div><div className="text-2xl font-semibold text-primary">{eur(rec.reduce((s, d) => s + solicitadora(d), 0))}</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Parte da Dinâmico</div><div className="text-2xl font-semibold">{eur(rows.reduce((s, d) => s + dinamico(d), 0))}</div></CardContent></Card>
      </div>
      {rows.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma declaração feita neste mês.</p> : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left"><tr><th className="p-2">Data</th><th className="p-2">Prédio</th><th className="p-2">Fração</th><th className="p-2">Tipo</th><th className="p-2 text-right">Preço</th><th className="p-2 text-right">Solicitadora</th></tr></thead>
            <tbody>{rows.map((d) => { const e = edMap.get(d.edificio_id); return (
              <tr key={d.id} className="border-t">
                <td className="p-2">{new Date(d.feita_em ?? d.created_at).toLocaleDateString("pt-PT")}</td>
                <td className="p-2">{e?.identificacao_interna ? `${e.identificacao_interna} — ` : ""}{e?.nome}</td>
                <td className="p-2">{d.fracao || "—"}</td>
                <td className="p-2">{d.reconhecida ? "Reconhecida" : "Sem reconhecimento"} · {d.urgente ? "Urgente" : "Normal"}</td>
                <td className="p-2 text-right">{eur(preco(d))}</td>
                <td className="p-2 text-right">{d.reconhecida ? eur(solicitadora(d)) : "—"}</td>
              </tr>); })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DecDialog({ eds, onDone, dec }: { eds: Ed[]; onDone: () => void; dec?: Dec }) {
  const [open, setOpen] = useState(false);
  const empty = { edificio_id: "", fracao: "", proprietario: "", nif: "", observacoes: "", urgente: false, reconhecida: false, quota_mensal: "", fundo_reserva: "", quota_seguro: "Nada em vigor", quota_extraordinaria: "Nada em vigor" };
  const fromDec = (d: Dec) => ({ edificio_id: d.edificio_id, fracao: d.fracao ?? "", proprietario: d.proprietario ?? "", nif: d.nif ?? "", observacoes: d.observacoes ?? "", urgente: d.urgente, reconhecida: d.reconhecida, quota_mensal: d.quota_mensal ?? "", fundo_reserva: d.fundo_reserva ?? "", quota_seguro: d.quota_seguro ?? "", quota_extraordinaria: d.quota_extraordinaria ?? "" });
  const [f, setF] = useState(empty);
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
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setF(dec ? fromDec(dec) : empty); }}>
      <DialogTrigger asChild>{dec ? <Button size="icon" variant="ghost" title="Editar"><Pencil className="h-4 w-4" /></Button> : <Button><Plus className="mr-1 h-4 w-4" />Nova declaração</Button>}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader><DialogTitle>{dec ? "Editar declaração" : "Nova declaração"}</DialogTitle></DialogHeader>
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
           <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
             <div><Label>Quota mensal (€)</Label><Input inputMode="decimal" value={f.quota_mensal} onChange={(e) => setF({ ...f, quota_mensal: e.target.value })} /></div>
             <div><Label>Fundo comum de reserva (€)</Label><Input inputMode="decimal" value={f.fundo_reserva} onChange={(e) => setF({ ...f, fundo_reserva: e.target.value })} /></div>
             <div><Label>Quota seguro condomínio (€)</Label><Input value={f.quota_seguro} onChange={(e) => setF({ ...f, quota_seguro: e.target.value })} /></div>
             <div><Label>Quota extraordinária</Label><Input value={f.quota_extraordinaria} onChange={(e) => setF({ ...f, quota_extraordinaria: e.target.value })} /></div>
           </div>
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

