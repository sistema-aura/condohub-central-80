import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Trash2, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/assembleias")({
  head: () => ({ meta: [{ title: "Assembleias — Condomínio Dinâmico" }] }),
  component: Page,
});

type Ass = { id: string; edificio_id: string; data_hora: string; local: string | null; observacoes: string | null; convocatoria_enviada: boolean };
type Ed = { id: string; nome: string; identificacao_interna: string | null };
type Form = { id?: string; edificio_id: string; dia: string; hora: string; local: string; observacoes: string; convocatoria_enviada: boolean };

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const DIA = 86400000;

function Page() {
  const qc = useQueryClient();
  const [mes, setMes] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [form, setForm] = useState<Form | null>(null);
  const eds = useQuery({ queryKey: ["eds-min"], queryFn: async () => (await supabase.from("edificios").select("id,nome,identificacao_interna").order("identificacao_interna")).data as Ed[] });
  const ass = useQuery({ queryKey: ["assembleias"], queryFn: async () => (await supabase.from("assembleias").select("*").order("data_hora")).data as Ass[] });
  const edMap = new Map((eds.data ?? []).map((e) => [e.id, e]));
  const nomeEd = (id: string) => { const e = edMap.get(id); return e ? `${e.identificacao_interna ? e.identificacao_interna + " · " : ""}${e.nome}` : "—"; };
  const refresh = () => qc.invalidateQueries({ queryKey: ["assembleias"] });

  const abrir = (dia: string, a?: Ass) => {
    if (a) { const d = new Date(a.data_hora); setForm({ id: a.id, edificio_id: a.edificio_id, dia: ymd(d), hora: `${pad(d.getHours())}:${pad(d.getMinutes())}`, local: a.local ?? "", observacoes: a.observacoes ?? "", convocatoria_enviada: a.convocatoria_enviada }); }
    else setForm({ edificio_id: "", dia, hora: "19:00", local: "", observacoes: "", convocatoria_enviada: false });
  };
  const guardar = async () => {
    if (!form?.edificio_id) return toast.error("Escolhe o prédio");
    const row = { edificio_id: form.edificio_id, data_hora: new Date(`${form.dia}T${form.hora}`).toISOString(), local: form.local || null, observacoes: form.observacoes || null, convocatoria_enviada: form.convocatoria_enviada };
    const { error } = form.id ? await supabase.from("assembleias").update(row).eq("id", form.id) : await supabase.from("assembleias").insert(row);
    if (error) return toast.error(error.message);
    setForm(null); refresh(); toast.success("Guardado");
  };
  const apagar = async () => { if (!form?.id || !confirm("Apagar esta assembleia?")) return; await supabase.from("assembleias").delete().eq("id", form.id); setForm(null); refresh(); };

  const agora = Date.now();
  const lista = ass.data ?? [];
  const convocar = lista.filter((a) => !a.convocatoria_enviada && new Date(a.data_hora).getTime() > agora && new Date(a.data_hora).getTime() - agora <= 12 * DIA);
  const proximas = lista.filter((a) => { const t = new Date(a.data_hora).getTime() - agora; return t > 0 && t <= 2 * DIA; });

  const inicio = new Date(mes); inicio.setDate(1 - ((mes.getDay() + 6) % 7));
  const dias = Array.from({ length: 42 }, (_, i) => new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i));
  const hoje = ymd(new Date());

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-2xl font-semibold mr-auto">Assembleias</h1>
        <span className="flex items-center gap-1 text-xs"><span className="h-3 w-3 rounded bg-orange-500" />Convocatória por enviar</span>
        <span className="flex items-center gap-1 text-xs"><span className="h-3 w-3 rounded bg-blue-600" />Convocatória enviada</span>
        <Button onClick={() => abrir(hoje)}><Plus className="h-4 w-4 mr-1" />Marcar reunião</Button>
      </div>

      {(convocar.length > 0 || proximas.length > 0) && (
        <div className="rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm space-y-1">
          <div className="font-medium flex items-center gap-1"><Bell className="h-4 w-4" />Avisos</div>
          {convocar.map((a) => <div key={a.id} className="cursor-pointer hover:underline" onClick={() => abrir("", a)}>📨 Enviar convocatória — {nomeEd(a.edificio_id)} (reunião {new Date(a.data_hora).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })})</div>)}
          {proximas.map((a) => <div key={"p" + a.id}>📅 Reunião em breve — {nomeEd(a.edificio_id)} ({new Date(a.data_hora).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })})</div>)}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
        <div className="font-medium w-44 text-center capitalize">{mes.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}</div>
        <Button variant="outline" size="icon" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-7 border rounded-lg overflow-hidden bg-background text-sm">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => <div key={d} className="p-2 text-center font-medium border-b bg-muted/50">{d}</div>)}
        {dias.map((d) => {
          const k = ymd(d);
          const doDia = lista.filter((a) => ymd(new Date(a.data_hora)) === k);
          return (
            <div key={k} onClick={() => abrir(k)} className={`min-h-24 border-b border-r p-1 cursor-pointer hover:bg-muted/40 ${d.getMonth() !== mes.getMonth() ? "opacity-40" : ""}`}>
              <div className={`text-xs mb-1 ${k === hoje ? "font-bold text-primary" : ""}`}>{d.getDate()}</div>
              {doDia.map((a) => (
                <div key={a.id} onClick={(e) => { e.stopPropagation(); abrir(k, a); }} className={`mb-1 truncate rounded px-1 py-0.5 text-xs text-white ${a.convocatoria_enviada ? "bg-blue-600" : "bg-orange-500"}`}>
                  {new Date(a.data_hora).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })} {nomeEd(a.edificio_id)}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{form?.id ? "Editar assembleia" : "Marcar assembleia"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div><Label>Prédio</Label>
                <select className="w-full h-9 rounded-md border bg-background px-2 text-sm" value={form.edificio_id} onChange={(e) => setForm({ ...form, edificio_id: e.target.value })}>
                  <option value="">Escolher…</option>
                  {(eds.data ?? []).map((e) => <option key={e.id} value={e.id}>{nomeEd(e.id)}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Dia</Label><Input type="date" value={form.dia} onChange={(e) => setForm({ ...form, dia: e.target.value })} /></div>
                <div><Label>Hora</Label><Input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} /></div>
              </div>
              <div><Label>Local</Label><Input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} /></div>
              <div><Label>Notas</Label><Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.convocatoria_enviada} onCheckedChange={(v) => setForm({ ...form, convocatoria_enviada: v })} />Convocatória enviada</label>
              <div className="flex gap-2 justify-end">
                {form.id && <Button variant="outline" onClick={apagar}><Trash2 className="h-4 w-4" /></Button>}
                <Button onClick={guardar}>Guardar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
