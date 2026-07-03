import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2, Save, Plus, Download, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/condominios/$id")({
  component: CondominioDetalhe,
});

function CondominioDetalhe() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isAdmin = useIsAdmin();

  const { data: cond, isLoading } = useQuery({
    queryKey: ["condominio", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("condominios").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  async function apagar() {
    const { error } = await supabase.from("condominios").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Condomínio apagado");
    qc.invalidateQueries({ queryKey: ["condominios-list"] });
    navigate({ to: "/dashboard" });
  }

  if (isLoading) return <div className="p-6 text-muted-foreground">A carregar...</div>;
  if (!cond) return <div className="p-6">Condomínio não encontrado.</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button asChild variant="ghost" size="sm">
          <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
        </Button>
        {isAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" /> Apagar</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Apagar condomínio?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação apaga o condomínio e todos os dados associados (eletricidade, banco, seguros, contactos e documentos). Não pode ser revertida.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={apagar}>Apagar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{cond.nome}</h1>
            <Badge variant={cond.ativo ? "default" : "secondary"}>{cond.ativo ? "Ativo" : "Inativo"}</Badge>
          </div>
          {cond.numero_interno && <p className="text-sm text-muted-foreground mt-1">Ref: {cond.numero_interno}</p>}
        </div>
      </div>

      <Tabs defaultValue="geral">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="eletricidade">Eletricidade</TabsTrigger>
          <TabsTrigger value="banco">Banco</TabsTrigger>
          <TabsTrigger value="seguros">Seguros</TabsTrigger>
          <TabsTrigger value="contactos">Contactos</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="geral"><GeralTab condId={id} /></TabsContent>
        <TabsContent value="eletricidade"><EletricidadeTab condId={id} /></TabsContent>
        <TabsContent value="banco"><BancoTab condId={id} /></TabsContent>
        <TabsContent value="seguros"><SegurosTab condId={id} isAdmin={isAdmin} /></TabsContent>
        <TabsContent value="contactos"><ContactosTab condId={id} isAdmin={isAdmin} /></TabsContent>
        <TabsContent value="documentos"><DocumentosTab condId={id} isAdmin={isAdmin} /></TabsContent>
      </Tabs>
    </div>
  );
}

function useEntity<T>(table: string, condId: string, single = true) {
  return useQuery({
    queryKey: [table, condId],
    queryFn: async () => {
      const q = supabase.from(table as never).select("*").eq("condominio_id", condId);
      const { data, error } = single ? await q.maybeSingle() : await q.order("created_at");
      if (error) throw error;
      return data as T;
    },
  });
}

function GeralTab({ condId }: { condId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["condominio", condId],
    queryFn: async () => {
      const { data, error } = await supabase.from("condominios").select("*").eq("id", condId).single();
      if (error) throw error;
      return data;
    },
  });
  const [form, setForm] = useState<Record<string, unknown>>({});
  useEffect(() => { if (data) setForm(data as Record<string, unknown>); }, [data]);

  async function save() {
    const { error } = await supabase.from("condominios").update({
      nome: form.nome as string, numero_interno: form.numero_interno as string | null,
      morada: form.morada as string | null, codigo_postal: form.codigo_postal as string | null,
      localidade: form.localidade as string | null, ativo: !!form.ativo,
      observacoes: form.observacoes as string | null,
    }).eq("id", condId);
    if (error) return toast.error(error.message);
    toast.success("Guardado");
    qc.invalidateQueries({ queryKey: ["condominio", condId] });
    qc.invalidateQueries({ queryKey: ["condominios-list"] });
  }

  return (
    <Card><CardContent className="pt-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-2"><Label>Nome</Label>
          <Input value={String(form.nome ?? "")} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
        <div className="space-y-2"><Label>Nº interno</Label>
          <Input value={String(form.numero_interno ?? "")} onChange={(e) => setForm({ ...form, numero_interno: e.target.value })} /></div>
      </div>
      <div className="space-y-2"><Label>Morada</Label>
        <Input value={String(form.morada ?? "")} onChange={(e) => setForm({ ...form, morada: e.target.value })} /></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2"><Label>Código postal</Label>
          <Input value={String(form.codigo_postal ?? "")} onChange={(e) => setForm({ ...form, codigo_postal: e.target.value })} /></div>
        <div className="md:col-span-2 space-y-2"><Label>Localidade</Label>
          <Input value={String(form.localidade ?? "")} onChange={(e) => setForm({ ...form, localidade: e.target.value })} /></div>
      </div>
      <div className="space-y-2"><Label>Observações</Label>
        <Textarea rows={3} value={String(form.observacoes ?? "")} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
      <div className="flex items-center gap-2">
        <Switch checked={!!form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
        <Label>Ativo</Label>
      </div>
      <div className="flex justify-end"><Button onClick={save}><Save className="h-4 w-4" />Guardar</Button></div>
    </CardContent></Card>
  );
}

function upsertOne(table: string, condId: string) {
  return async (payload: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase.from(table as any) as any;
    const { error } = await client.upsert(
      { ...payload, condominio_id: condId },
      { onConflict: "condominio_id" },
    );
    if (error) throw error;
  };
}

function EletricidadeTab({ condId }: { condId: string }) {
  const qc = useQueryClient();
  const { data } = useEntity<Record<string, unknown> | null>("contratos_eletricidade", condId, true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  useEffect(() => { setForm(data ?? {}); }, [data]);

  async function save() {
    try {
      await upsertOne("contratos_eletricidade", condId)({
        companhia: form.companhia, numero_contrato: form.numero_contrato,
        cpe: form.cpe, titular: form.titular, data_inicio: form.data_inicio || null,
        observacoes: form.observacoes,
      });
      toast.success("Guardado");
      qc.invalidateQueries({ queryKey: ["contratos_eletricidade", condId] });
      qc.invalidateQueries({ queryKey: ["condominios-list"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Card><CardContent className="pt-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Companhia</Label>
          <Input value={String(form.companhia ?? "")} onChange={(e) => setForm({ ...form, companhia: e.target.value })} /></div>
        <div className="space-y-2"><Label>Nº de contrato</Label>
          <Input value={String(form.numero_contrato ?? "")} onChange={(e) => setForm({ ...form, numero_contrato: e.target.value })} /></div>
        <div className="space-y-2"><Label>CPE</Label>
          <Input value={String(form.cpe ?? "")} onChange={(e) => setForm({ ...form, cpe: e.target.value })} /></div>
        <div className="space-y-2"><Label>Titular</Label>
          <Input value={String(form.titular ?? "")} onChange={(e) => setForm({ ...form, titular: e.target.value })} /></div>
        <div className="space-y-2"><Label>Data de início</Label>
          <Input type="date" value={String(form.data_inicio ?? "")} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} /></div>
      </div>
      <div className="space-y-2"><Label>Observações</Label>
        <Textarea rows={3} value={String(form.observacoes ?? "")} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
      <div className="flex justify-end"><Button onClick={save}><Save className="h-4 w-4" />Guardar</Button></div>
    </CardContent></Card>
  );
}

function BancoTab({ condId }: { condId: string }) {
  const qc = useQueryClient();
  const { data } = useEntity<Record<string, unknown> | null>("contas_bancarias", condId, true);
  const [form, setForm] = useState<Record<string, unknown>>({});
  useEffect(() => { setForm(data ?? {}); }, [data]);

  async function save() {
    try {
      await upsertOne("contas_bancarias", condId)({
        banco: form.banco, iban: form.iban, numero_conta: form.numero_conta,
        site_url: form.site_url, observacoes_acesso: form.observacoes_acesso,
      });
      toast.success("Guardado");
      qc.invalidateQueries({ queryKey: ["contas_bancarias", condId] });
      qc.invalidateQueries({ queryKey: ["condominios-list"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Card><CardContent className="pt-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Banco</Label>
          <Input value={String(form.banco ?? "")} onChange={(e) => setForm({ ...form, banco: e.target.value })} /></div>
        <div className="space-y-2"><Label>IBAN</Label>
          <Input value={String(form.iban ?? "")} onChange={(e) => setForm({ ...form, iban: e.target.value })} /></div>
        <div className="space-y-2"><Label>Nº de conta</Label>
          <Input value={String(form.numero_conta ?? "")} onChange={(e) => setForm({ ...form, numero_conta: e.target.value })} /></div>
        <div className="space-y-2"><Label>Site do banco</Label>
          <Input type="url" placeholder="https://..." value={String(form.site_url ?? "")} onChange={(e) => setForm({ ...form, site_url: e.target.value })} /></div>
      </div>
      <div className="space-y-2"><Label>Observações de acesso</Label>
        <Textarea rows={3}
          placeholder="Ex.: consultar gestor de passwords da empresa"
          value={String(form.observacoes_acesso ?? "")}
          onChange={(e) => setForm({ ...form, observacoes_acesso: e.target.value })} /></div>
      <p className="text-xs text-muted-foreground">
        ⚠️ Por segurança, esta aplicação não guarda palavras-passe bancárias. Usa o campo acima para indicar onde consultar as credenciais.
      </p>
      <div className="flex justify-end"><Button onClick={save}><Save className="h-4 w-4" />Guardar</Button></div>
    </CardContent></Card>
  );
}

type SeguroRow = { id: string; companhia: string | null; numero_apolice: string | null; tipo: string | null; data_inicio: string | null; data_fim: string | null; observacoes: string | null };

function SegurosTab({ condId, isAdmin }: { condId: string; isAdmin: boolean }) {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["seguros", condId],
    queryFn: async () => {
      const { data, error } = await supabase.from("seguros").select("*").eq("condominio_id", condId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as SeguroRow[];
    },
  });
  const [editing, setEditing] = useState<Partial<SeguroRow> | null>(null);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["seguros", condId] });

  async function save() {
    if (!editing) return;
    const payload = {
      condominio_id: condId,
      companhia: editing.companhia ?? null,
      numero_apolice: editing.numero_apolice ?? null,
      tipo: editing.tipo ?? null,
      data_inicio: editing.data_inicio || null,
      data_fim: editing.data_fim || null,
      observacoes: editing.observacoes ?? null,
    };
    const { error } = editing.id
      ? await supabase.from("seguros").update(payload).eq("id", editing.id)
      : await supabase.from("seguros").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Guardado");
    setEditing(null); invalidate();
  }

  async function apagar(sid: string) {
    const { error } = await supabase.from("seguros").delete().eq("id", sid);
    if (error) return toast.error(error.message);
    toast.success("Apagado"); invalidate();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setEditing({})}><Plus className="h-4 w-4" />Adicionar seguro</Button>
      </div>
      {editing && (
        <Card><CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Companhia</Label><Input value={editing.companhia ?? ""} onChange={(e) => setEditing({ ...editing, companhia: e.target.value })} /></div>
            <div className="space-y-2"><Label>Nº apólice</Label><Input value={editing.numero_apolice ?? ""} onChange={(e) => setEditing({ ...editing, numero_apolice: e.target.value })} /></div>
            <div className="space-y-2"><Label>Tipo</Label><Input value={editing.tipo ?? ""} onChange={(e) => setEditing({ ...editing, tipo: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2"><Label>Início</Label><Input type="date" value={editing.data_inicio ?? ""} onChange={(e) => setEditing({ ...editing, data_inicio: e.target.value })} /></div>
              <div className="space-y-2"><Label>Fim / renovação</Label><Input type="date" value={editing.data_fim ?? ""} onChange={(e) => setEditing({ ...editing, data_fim: e.target.value })} /></div>
            </div>
          </div>
          <div className="space-y-2"><Label>Observações</Label><Textarea rows={2} value={editing.observacoes ?? ""} onChange={(e) => setEditing({ ...editing, observacoes: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save}>Guardar</Button>
          </div>
        </CardContent></Card>
      )}
      <div className="space-y-2">
        {data.length === 0 && <p className="text-sm text-muted-foreground">Sem seguros registados.</p>}
        {data.map((s) => (
          <Card key={s.id}><CardContent className="pt-6 flex items-start justify-between gap-4">
            <div className="text-sm space-y-1">
              <div className="font-medium">{s.companhia || "Sem companhia"} — {s.tipo || "sem tipo"}</div>
              <div className="text-muted-foreground">Apólice: {s.numero_apolice || "—"}</div>
              <div className="text-muted-foreground">Válido: {s.data_inicio || "—"} até {s.data_fim || "—"}</div>
              {s.observacoes && <div className="text-muted-foreground text-xs">{s.observacoes}</div>}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(s)}>Editar</Button>
              {isAdmin && <Button size="sm" variant="ghost" onClick={() => apagar(s.id)}><Trash2 className="h-4 w-4" /></Button>}
            </div>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}

type ContactoRow = { id: string; nome: string; funcao: string | null; telefone: string | null; email: string | null; observacoes: string | null };

function ContactosTab({ condId, isAdmin }: { condId: string; isAdmin: boolean }) {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["contactos", condId],
    queryFn: async () => {
      const { data, error } = await supabase.from("contactos").select("*").eq("condominio_id", condId).order("nome");
      if (error) throw error;
      return data as ContactoRow[];
    },
  });
  const [editing, setEditing] = useState<Partial<ContactoRow> | null>(null);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["contactos", condId] });

  async function save() {
    if (!editing || !editing.nome?.trim()) return toast.error("Nome é obrigatório");
    const payload = {
      condominio_id: condId,
      nome: editing.nome.trim(),
      funcao: editing.funcao ?? null,
      telefone: editing.telefone ?? null,
      email: editing.email ?? null,
      observacoes: editing.observacoes ?? null,
    };
    const { error } = editing.id
      ? await supabase.from("contactos").update(payload).eq("id", editing.id)
      : await supabase.from("contactos").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Guardado"); setEditing(null); invalidate();
  }

  async function apagar(cid: string) {
    const { error } = await supabase.from("contactos").delete().eq("id", cid);
    if (error) return toast.error(error.message);
    toast.success("Apagado"); invalidate();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setEditing({})}><Plus className="h-4 w-4" />Adicionar contacto</Button>
      </div>
      {editing && (
        <Card><CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={editing.nome ?? ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} /></div>
            <div className="space-y-2"><Label>Função</Label><Input value={editing.funcao ?? ""} onChange={(e) => setEditing({ ...editing, funcao: e.target.value })} /></div>
            <div className="space-y-2"><Label>Telefone</Label><Input value={editing.telefone ?? ""} onChange={(e) => setEditing({ ...editing, telefone: e.target.value })} /></div>
            <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Observações</Label><Textarea rows={2} value={editing.observacoes ?? ""} onChange={(e) => setEditing({ ...editing, observacoes: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save}>Guardar</Button>
          </div>
        </CardContent></Card>
      )}
      <div className="space-y-2">
        {data.length === 0 && <p className="text-sm text-muted-foreground">Sem contactos registados.</p>}
        {data.map((c) => (
          <Card key={c.id}><CardContent className="pt-6 flex items-start justify-between gap-4">
            <div className="text-sm space-y-1">
              <div className="font-medium">{c.nome} {c.funcao && <span className="text-muted-foreground font-normal">— {c.funcao}</span>}</div>
              {c.telefone && <div className="text-muted-foreground">📞 {c.telefone}</div>}
              {c.email && <div className="text-muted-foreground">✉️ {c.email}</div>}
              {c.observacoes && <div className="text-muted-foreground text-xs">{c.observacoes}</div>}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(c)}>Editar</Button>
              {isAdmin && <Button size="sm" variant="ghost" onClick={() => apagar(c.id)}><Trash2 className="h-4 w-4" /></Button>}
            </div>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}

type DocRow = { id: string; nome: string; storage_path: string; mime_type: string | null; tamanho: number | null; created_at: string };

function DocumentosTab({ condId, isAdmin }: { condId: string; isAdmin: boolean }) {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const { data = [] } = useQuery({
    queryKey: ["documentos", condId],
    queryFn: async () => {
      const { data, error } = await supabase.from("documentos").select("*").eq("condominio_id", condId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as DocRow[];
    },
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["documentos", condId] });

  async function upload(file: File) {
    setUploading(true);
    const path = `${condId}/${Date.now()}-${file.name}`;
    const up = await supabase.storage.from("condominio-docs").upload(path, file);
    if (up.error) { setUploading(false); return toast.error(up.error.message); }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("documentos").insert({
      condominio_id: condId, nome: file.name, storage_path: path,
      mime_type: file.type, tamanho: file.size, uploaded_by: u.user?.id ?? null,
    });
    setUploading(false);
    if (error) return toast.error(error.message);
    toast.success("Documento anexado"); invalidate();
  }

  async function download(d: DocRow) {
    const { data, error } = await supabase.storage.from("condominio-docs").createSignedUrl(d.storage_path, 60);
    if (error || !data) return toast.error(error?.message ?? "Erro");
    window.open(data.signedUrl, "_blank");
  }

  async function apagar(d: DocRow) {
    await supabase.storage.from("condominio-docs").remove([d.storage_path]);
    const { error } = await supabase.from("documentos").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("Apagado"); invalidate();
  }

  return (
    <div className="space-y-4">
      <Card><CardContent className="pt-6">
        <Label htmlFor="file" className="block mb-2">Anexar documento</Label>
        <Input id="file" type="file" disabled={uploading}
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        <p className="text-xs text-muted-foreground mt-2">Contratos, apólices, atas, comprovativos, etc.</p>
      </CardContent></Card>
      <div className="space-y-2">
        {data.length === 0 && <p className="text-sm text-muted-foreground">Sem documentos.</p>}
        {data.map((d) => (
          <Card key={d.id}><CardContent className="pt-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-medium truncate">{d.nome}</div>
                <div className="text-xs text-muted-foreground">
                  {d.tamanho ? `${(d.tamanho / 1024).toFixed(1)} KB` : ""} · {new Date(d.created_at).toLocaleDateString("pt-PT")}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => download(d)}><Download className="h-4 w-4" />Abrir</Button>
              {isAdmin && <Button size="sm" variant="ghost" onClick={() => apagar(d)}><Trash2 className="h-4 w-4" /></Button>}
            </div>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
