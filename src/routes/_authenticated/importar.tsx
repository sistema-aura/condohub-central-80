import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import * as XLSX from "xlsx";
import { ArrowLeft, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/importar")({
  component: Importar,
});

type Row = Record<string, string | number | boolean | null | undefined>;

const CAMPOS = [
  "nome", "numero_interno", "morada", "codigo_postal", "localidade", "ativo", "observacoes",
  "eletricidade_companhia", "eletricidade_numero_contrato", "eletricidade_cpe", "eletricidade_titular",
  "banco_nome", "banco_iban", "banco_numero_conta", "banco_site_url",
];

function normalize(v: unknown): string {
  return String(v ?? "").trim();
}

function truthy(v: unknown): boolean {
  const s = normalize(v).toLowerCase();
  return ["1", "true", "sim", "ativo", "yes", "y", "s"].includes(s);
}

function Importar() {
  const [rows, setRows] = useState<Row[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: number; fail: number; errors: string[] } | null>(null);

  async function onFile(file: File) {
    setResult(null);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Row>(sheet, { defval: "" });
    setRows(json);
    toast.success(`${json.length} linhas lidas de "${file.name}"`);
  }

  async function importar() {
    setImporting(true);
    const errors: string[] = [];
    let ok = 0, fail = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const nome = normalize(r.nome);
      if (!nome) { fail++; errors.push(`Linha ${i + 2}: nome vazio`); continue; }
      try {
        const { data: cond, error } = await supabase.from("condominios").insert({
          nome,
          numero_interno: normalize(r.numero_interno) || null,
          morada: normalize(r.morada) || null,
          codigo_postal: normalize(r.codigo_postal) || null,
          localidade: normalize(r.localidade) || null,
          ativo: r.ativo === "" || r.ativo == null ? true : truthy(r.ativo),
          observacoes: normalize(r.observacoes) || null,
        }).select("id").single();
        if (error || !cond) throw new Error(error?.message ?? "erro");
        const elCamps = [r.eletricidade_companhia, r.eletricidade_numero_contrato, r.eletricidade_cpe, r.eletricidade_titular].some((v) => normalize(v));
        if (elCamps) {
          await supabase.from("contratos_eletricidade").insert({
            condominio_id: cond.id,
            companhia: normalize(r.eletricidade_companhia) || null,
            numero_contrato: normalize(r.eletricidade_numero_contrato) || null,
            cpe: normalize(r.eletricidade_cpe) || null,
            titular: normalize(r.eletricidade_titular) || null,
          });
        }
        const bkCamps = [r.banco_nome, r.banco_iban, r.banco_numero_conta, r.banco_site_url].some((v) => normalize(v));
        if (bkCamps) {
          await supabase.from("contas_bancarias").insert({
            condominio_id: cond.id,
            banco: normalize(r.banco_nome) || null,
            iban: normalize(r.banco_iban) || null,
            numero_conta: normalize(r.banco_numero_conta) || null,
            site_url: normalize(r.banco_site_url) || null,
          });
        }
        ok++;
      } catch (e) {
        fail++;
        errors.push(`Linha ${i + 2} (${nome}): ${(e as Error).message}`);
      }
    }
    setImporting(false);
    setResult({ ok, fail, errors: errors.slice(0, 20) });
    if (ok > 0) toast.success(`${ok} condomínios importados`);
    if (fail > 0) toast.error(`${fail} linhas com erro`);
  }

  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet([Object.fromEntries(CAMPOS.map((c) => [c, ""]))]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Condominios");
    XLSX.writeFile(wb, "template-condominios.xlsx");
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Importar condomínios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Carrega um ficheiro Excel (.xlsx) ou CSV. A primeira linha deve conter os nomes das colunas.
            Descarrega o template para veres o formato esperado.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>Descarregar template</Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">Ficheiro</Label>
            <Input id="file" type="file" accept=".xlsx,.xls,.csv"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </div>
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Colunas suportadas</summary>
            <ul className="list-disc pl-5 mt-2 space-y-0.5">
              {CAMPOS.map((c) => <li key={c}><code>{c}</code></li>)}
            </ul>
          </details>

          {rows.length > 0 && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{rows.length} linhas prontas para importar</span>
                <Button onClick={importar} disabled={importing}>
                  {importing ? "A importar..." : "Importar agora"}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Pré-visualização (primeiras 5): {rows.slice(0, 5).map((r) => normalize(r.nome)).filter(Boolean).join(", ")}
              </div>
            </div>
          )}

          {result && (
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-600"><CheckCircle2 className="h-4 w-4" /> {result.ok} importados com sucesso</div>
              {result.fail > 0 && (
                <>
                  <div className="flex items-center gap-2 text-destructive"><AlertCircle className="h-4 w-4" /> {result.fail} falharam</div>
                  <ul className="text-xs text-muted-foreground list-disc pl-5 max-h-40 overflow-auto">
                    {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
