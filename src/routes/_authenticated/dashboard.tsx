import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Search, Building2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type CondRow = {
  id: string;
  nome: string;
  numero_interno: string | null;
  morada: string | null;
  localidade: string | null;
  ativo: boolean;
  contratos_eletricidade: { companhia: string | null } | null;
  contas_bancarias: { banco: string | null } | null;
};

function Dashboard() {
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<string>("todos");
  const [banco, setBanco] = useState<string>("todos");
  const [companhia, setCompanhia] = useState<string>("todos");

  const { data = [], isLoading } = useQuery({
    queryKey: ["condominios-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condominios")
        .select("id, nome, numero_interno, morada, localidade, ativo, contratos_eletricidade(companhia), contas_bancarias(banco)")
        .order("nome");
      if (error) throw error;
      return data as CondRow[];
    },
  });

  const bancos = useMemo(
    () => Array.from(new Set(data.map((c) => c.contas_bancarias?.banco).filter(Boolean))) as string[],
    [data],
  );
  const companhias = useMemo(
    () => Array.from(new Set(data.map((c) => c.contratos_eletricidade?.companhia).filter(Boolean))) as string[],
    [data],
  );

  const filtered = data.filter((c) => {
    const s = q.trim().toLowerCase();
    if (s) {
      const hay = `${c.nome} ${c.morada ?? ""} ${c.numero_interno ?? ""}`.toLowerCase();
      if (!hay.includes(s)) return false;
    }
    if (estado === "ativo" && !c.ativo) return false;
    if (estado === "inativo" && c.ativo) return false;
    if (banco !== "todos" && c.contas_bancarias?.banco !== banco) return false;
    if (companhia !== "todos" && c.contratos_eletricidade?.companhia !== companhia) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Condomínios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data.length} {data.length === 1 ? "condomínio" : "condomínios"} na base de dados
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/importar"><Upload className="h-4 w-4" /> Importar</Link>
          </Button>
          <Button asChild>
            <Link to="/condominios/novo"><Plus className="h-4 w-4" /> Novo condomínio</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, morada ou nº interno..."
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={banco} onValueChange={setBanco}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Banco" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os bancos</SelectItem>
            {bancos.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={companhia} onValueChange={setCompanhia}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Eletricidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as companhias</SelectItem>
            {companhias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Nº</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Morada</TableHead>
              <TableHead>Localidade</TableHead>
              <TableHead>Banco</TableHead>
              <TableHead>Eletricidade</TableHead>
              <TableHead className="w-[100px]">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">A carregar...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                {data.length === 0 ? "Ainda não existem condomínios. Cria o primeiro ou importa uma lista." : "Sem resultados para os filtros aplicados."}
              </TableCell></TableRow>
            ) : filtered.map((c) => (
              <TableRow key={c.id} className="cursor-pointer hover:bg-accent/50" onClick={() => (window.location.href = `/condominios/${c.id}`)}>
                <TableCell className="font-mono text-xs">{c.numero_interno || "—"}</TableCell>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.morada || "—"}</TableCell>
                <TableCell className="text-sm">{c.localidade || "—"}</TableCell>
                <TableCell className="text-sm">{c.contas_bancarias?.banco || "—"}</TableCell>
                <TableCell className="text-sm">{c.contratos_eletricidade?.companhia || "—"}</TableCell>
                <TableCell>
                  <Badge variant={c.ativo ? "default" : "secondary"}>
                    {c.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
