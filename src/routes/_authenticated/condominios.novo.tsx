import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/condominios/novo")({
  component: NovoCondominio,
});

function NovoCondominio() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    numero_interno: "",
    morada: "",
    codigo_postal: "",
    localidade: "",
    ativo: true,
    observacoes: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) {
      toast.error("O nome é obrigatório");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("condominios")
      .insert({
        nome: form.nome.trim(),
        numero_interno: form.numero_interno || null,
        morada: form.morada || null,
        codigo_postal: form.codigo_postal || null,
        localidade: form.localidade || null,
        ativo: form.ativo,
        observacoes: form.observacoes || null,
      })
      .select("id")
      .single();
    setLoading(false);
    if (error || !data) {
      toast.error(error?.message ?? "Erro ao criar condomínio");
      return;
    }
    toast.success("Condomínio criado");
    navigate({ to: "/condominios/$id", params: { id: data.id } });
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
      </Button>
      <Card>
        <CardHeader><CardTitle>Novo condomínio</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input id="nome" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="num">Nº interno / referência</Label>
                <Input id="num" value={form.numero_interno} onChange={(e) => setForm({ ...form, numero_interno: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mor">Morada</Label>
              <Input id="mor" value={form.morada} onChange={(e) => setForm({ ...form, morada: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cp">Código postal</Label>
                <Input id="cp" value={form.codigo_postal} onChange={(e) => setForm({ ...form, codigo_postal: e.target.value })} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="loc">Localidade</Label>
                <Input id="loc" value={form.localidade} onChange={(e) => setForm({ ...form, localidade: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="obs">Observações</Label>
              <Textarea id="obs" rows={3} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="ativo" checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
              <Label htmlFor="ativo">Ativo</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button asChild type="button" variant="outline"><Link to="/dashboard">Cancelar</Link></Button>
              <Button type="submit" disabled={loading}>{loading ? "A criar..." : "Criar"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
