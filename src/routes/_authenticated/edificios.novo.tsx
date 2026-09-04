import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/edificios/novo")({
  head: () => ({
    meta: [
      { title: "Novo edifício — Condomínio Dinâmico" },
      { name: "description", content: "Criar um novo edifício na base de dados da empresa." },
      { property: "og:title", content: "Novo edifício — Condomínio Dinâmico" },
      { property: "og:description", content: "Criar um novo edifício na base de dados da empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NovoEdificio,
});

function NovoEdificio() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: "",
    identificacao_interna: "",
    morada: "",
    codigo_postal: "",
    localidade: "",
    observacoes: "",
  });

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const criar = useMutation({
    mutationFn: async () => {
      const nome = form.nome.trim();
      if (!nome) throw new Error("O nome do edifício é obrigatório.");
      const { data, error } = await supabase
        .from("edificios")
        .insert({
          nome: nome.slice(0, 200),
          identificacao_interna: form.identificacao_interna.trim() || null,
          morada: form.morada.trim() || null,
          codigo_postal: form.codigo_postal.trim() || null,
          localidade: form.localidade.trim() || null,
          observacoes: form.observacoes.trim() || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["edificios"] });
      toast.success("Edifício criado.");
      navigate({ to: "/edificios/$id", params: { id: data.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto w-full max-w-2xl p-4 md:p-8 space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Novo edifício</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              criar.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" required maxLength={200} value={form.nome} onChange={set("nome")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ident">Identificação interna</Label>
              <Input
                id="ident"
                maxLength={50}
                placeholder="Ex.: 005"
                value={form.identificacao_interna}
                onChange={set("identificacao_interna")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="morada">Morada</Label>
              <Input id="morada" maxLength={300} value={form.morada} onChange={set("morada")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cp">Código postal</Label>
                <Input id="cp" maxLength={20} value={form.codigo_postal} onChange={set("codigo_postal")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc">Localidade</Label>
                <Input id="loc" maxLength={100} value={form.localidade} onChange={set("localidade")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="obs">Notas</Label>
              <Textarea id="obs" rows={3} maxLength={2000} value={form.observacoes} onChange={set("observacoes")} />
            </div>
            <Button type="submit" disabled={criar.isPending}>
              {criar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar edifício
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
