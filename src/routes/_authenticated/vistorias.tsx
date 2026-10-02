import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Wrench, Building2, Clock, Trash2, Pencil, Search, Send } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { notificarPessoas } from "@/lib/telegram.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/vistorias")({
  head: () => ({
    meta: [
      { title: "Vistorias — Condomínio Dinâmico" },
      { name: "description", content: "Registo das visitas de manutenção aos prédios." },
      { property: "og:title", content: "Vistorias — Condomínio Dinâmico" },
      { property: "og:description", content: "Registo das visitas de manutenção aos prédios." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Vistorias,
});

const PESSOAS = ["Leonor", "Dina", "Eduardo"];
type V = { id: string; edificio_id: string | null; data: string; hora_inicio: string | null; hora_fim: string | null; pessoa: string; notas: string | null };
const hoje = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Lisbon" });
const vazio = () => ({ id: "", edificio_id: "", data: hoje(), hora_inicio: "", hora_fim: "", pessoa: "Eduardo", notas: "" });

function Vistorias() {
  const qc = useQueryClient();
  const notificar = useServerFn(notificarPessoas);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<ReturnType<typeof vazio> | null>(null);
  const [avisar, setAvisar] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const { data: eds = [] } = useQuery({
    queryKey: ["edificios-min"],
    queryFn: async () => (await supabase.from("edificios").select("id,nome,identificacao_interna").order("identificacao_interna")).data ?? [],
  });
  const { data: lista = [] } = useQuery({
    queryKey: ["vistorias"],
    queryFn: async () => ((await supabase.from("vistorias").select("*").order("data", { ascending: false }).order("hora_inicio", { ascending: false })).data ?? []) as V[],
  });
  const edMap = useMemo(() => Object.fromEntries(eds.map((e) => [e.id, `${e.identificacao_interna ?? ""} ${e.nome}`.trim()])), [eds]);
  const filtradas = lista.filter((v) => `${edMap[v.edificio_id ?? ""] ?? ""} ${v.notas ?? ""} ${v.pessoa}`.toLowerCase().includes(q.toLowerCase()));

  const guardar = async () => {
    if (!form) return;
    setBusy(true);
    const row = {
      edificio_id: form.edificio_id || null, data: form.data, pessoa: form.pessoa,
      hora_inicio: form.hora_inicio || null, hora_fim: form.hora_fim || null, notas: form.notas || null,
    };
    const { error } = form.id ? await supabase.from("vistorias").update(row).eq("id", form.id) : await supabase.from("vistorias").insert(row);
    if (error) { setBusy(false); return toast.error(error.message); }
    if (avisar.length) {
      const d = new Date(form.data + "T12:00").toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" });
      const h = form.hora_inicio ? ` · ${form.hora_inicio.slice(0, 5)}${form.hora_fim ? "–" + form.hora_fim.slice(0, 5) : ""}` : "";
      const texto = `🔧 Vistoria — ${edMap[form.edificio_id] ?? "Prédio"}\n📅 ${d}${h}\n👤 ${form.pessoa}${form.notas ? `\n📝 ${form.notas}` : ""}`;
      try { const r = await notificar({ data: { pessoas: avisar, texto } }); toast.success(`Aviso enviado a ${r.enviados.join(", ") || "ninguém"}`); }
      catch (e) { toast.error((e as Error).message); }
    }
    toast.success("Vistoria guardada");
    setBusy(false); setForm(null);
    qc.invalidateQueries({ queryKey: ["vistorias"] });
  };
  const apagar = async (id: string) => {
    if (!confirm("Apagar esta vistoria?")) return;
    await supabase.from("vistorias").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["vistorias"] });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight"><Wrench className="h-7 w-7 text-primary" /> Vistorias</h1>
          <p className="text-muted-foreground">Visitas de manutenção aos prédios e o que foi feito.</p>
        </div>
        <Button onClick={() => { setForm(vazio()); setAvisar([]); }}><Plus className="mr-1 h-4 w-4" /> Nova vistoria</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Pesquisar prédio, notas ou pessoa…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="space-y-3">
        {filtradas.length === 0 && <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">Ainda não há vistorias.</p>}
        {filtradas.map((v) => {
          const d = new Date(v.data + "T12:00");
          return (
            <div key={v.id} className="flex gap-4 rounded-xl border bg-card p-4 shadow-sm transition hover:shadow-md">
              <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 py-2 text-primary">
                <span className="text-2xl font-bold leading-none">{d.getDate()}</span>
                <span className="text-xs uppercase">{d.toLocaleDateString("pt-PT", { month: "short" })}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="flex items-center gap-1 font-semibold"><Building2 className="h-4 w-4" />{edMap[v.edificio_id ?? ""] ?? "Sem prédio"}</span>
                  {v.hora_inicio && <span className="flex items-center gap-1 text-sm text-muted-foreground"><Clock className="h-3.5 w-3.5" />{v.hora_inicio.slice(0, 5)}{v.hora_fim && `–${v.hora_fim.slice(0, 5)}`}</span>}
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{v.pessoa}</span>
                </div>
                {v.notas && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{v.notas}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setForm({ id: v.id, edificio_id: v.edificio_id ?? "", data: v.data, hora_inicio: v.hora_inicio?.slice(0, 5) ?? "", hora_fim: v.hora_fim?.slice(0, 5) ?? "", pessoa: v.pessoa, notas: v.notas ?? "" }); setAvisar([]); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => apagar(v.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form?.id ? "Editar vistoria" : "Nova vistoria"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Prédio</Label>
                <Select value={form.edificio_id} onValueChange={(v) => setForm({ ...form, edificio_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Escolhe o prédio" /></SelectTrigger>
                  <SelectContent>{eds.map((e) => <SelectItem key={e.id} value={e.id}>{edMap[e.id]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Chegada</Label><Input type="time" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Saída</Label><Input type="time" value={form.hora_fim} onChange={(e) => setForm({ ...form, hora_fim: e.target.value })} /></div>
              </div>
              <div className="space-y-1.5">
                <Label>Quem foi</Label>
                <div className="flex gap-2">{PESSOAS.map((p) => <Button key={p} type="button" size="sm" variant={form.pessoa === p ? "default" : "outline"} onClick={() => setForm({ ...form, pessoa: p })}>{p}</Button>)}</div>
              </div>
              <div className="space-y-1.5"><Label>Notas (o que se fez / o que falta)</Label><Textarea rows={4} placeholder="Ex.: trocada lâmpada do 2.º andar; falta lâmpada na garagem" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></div>
              <div className="space-y-1.5 rounded-lg border bg-muted/40 p-3">
                <Label className="flex items-center gap-1"><Send className="h-3.5 w-3.5" /> Avisar no Telegram (opcional)</Label>
                <div className="flex gap-2">{PESSOAS.map((p) => <Button key={p} type="button" size="sm" variant={avisar.includes(p) ? "default" : "outline"} onClick={() => setAvisar(avisar.includes(p) ? avisar.filter((x) => x !== p) : [...avisar, p])}>{p}</Button>)}</div>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button><Button disabled={busy} onClick={guardar}>Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
