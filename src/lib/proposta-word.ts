import {
  AlignmentType, BorderStyle, Document, Footer, ImageRun, LevelFormat, Packer, PageBreak, Paragraph,
  ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} from "docx";
import logoFull from "@/assets/logo-dinamico.png.asset.json";

export const PRECOS = { fracao: 8.5, loja: 6.5, elevador: 2.5, garagem: 3, estacionamento: 2, manutencao: 15 };
export const IVA = 0.23;

export type Proposta = {
  nome: string; morada: string; numero: string;
  fracoes: number; lojas: number; elevadores: number; garagens: number; estacionamentos: number;
  manutencao: boolean; limpeza: boolean; limpezaValor: number; limpezaFreq: string;
};

export function linhas(p: Proposta) {
  const l = [
    { d: "Frações habitacionais", q: p.fracoes, u: PRECOS.fracao },
    { d: "Lojas", q: p.lojas, u: PRECOS.loja },
    { d: "Elevadores", q: p.elevadores, u: PRECOS.elevador },
    { d: "Garagens (box com portão)", q: p.garagens, u: PRECOS.garagem },
    { d: "Lugares de estacionamento", q: p.estacionamentos, u: PRECOS.estacionamento },
  ].filter((x) => x.q > 0);
  if (p.manutencao) l.push({ d: "Manutenção (1 visita mensal)", q: 1, u: PRECOS.manutencao });
  return l;
}
export function totais(p: Proposta) {
  const gestao = linhas(p).reduce((s, x) => s + x.q * x.u, 0);
  const limpeza = p.limpeza ? p.limpezaValor || 0 : 0;
  const sem = gestao + limpeza;
  return { gestao, limpeza, sem, iva: sem * IVA, com: sem * (1 + IVA) };
}
export const eur = (n: number) => n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

const TEAL = "1F7A7A";
const W = 9026;
const P = (t: string, o: { b?: boolean; s?: number; c?: string; a?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number } = {}) =>
  new Paragraph({ alignment: o.a, spacing: { after: o.after ?? 120 }, children: [new TextRun({ text: t, bold: o.b, size: o.s, color: o.c })] });
const H = (t: string) => new Paragraph({
  spacing: { before: 280, after: 140 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: TEAL, space: 2 } },
  children: [new TextRun({ text: t.toUpperCase(), bold: true, size: 26, color: TEAL })],
});
const B = (t: string) => new Paragraph({ numbering: { reference: "b", level: 0 }, spacing: { after: 60 }, children: [new TextRun(t)] });

function cell(t: string, w: number, o: { b?: boolean; fill?: string; c?: string; right?: boolean } = {}) {
  const bd = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  return new TableCell({
    width: { size: w, type: WidthType.DXA }, borders: { top: bd, bottom: bd, left: bd, right: bd },
    shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ alignment: o.right ? AlignmentType.RIGHT : AlignmentType.LEFT, children: [new TextRun({ text: t, bold: o.b, color: o.c })] })],
  });
}

export async function descarregarProposta(p: Proposta) {
  const logo = new Uint8Array(await (await fetch(logoFull.url)).arrayBuffer());
  const t = totais(p);
  const cols = [6026, 1200, 1800];
  const row = (c: string[], o: { b?: boolean; fill?: string; c?: string } = {}) =>
    new TableRow({ children: c.map((x, i) => cell(x, cols[i], { ...o, right: i > 0 })) });
  const tabela = new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: cols,
    rows: [
      row(["Descrição", "Qtd.", "Subtotal"], { b: true, fill: TEAL, c: "FFFFFF" }),
      ...linhas(p).map((x) => row([x.d, String(x.q), eur(x.q * x.u)])),
      ...(p.limpeza ? [row([`Limpeza das partes comuns (${p.limpezaFreq || "a combinar"})`, "1", eur(t.limpeza)])] : []),
      row(["Total sem IVA", "", eur(t.sem)], { b: true, fill: "EEF6F6" }),
      row(["IVA (23%)", "", eur(t.iva)]),
      row(["TOTAL MENSAL COM IVA", "", eur(t.com)], { b: true, fill: "D6ECEC" }),
    ],
  });
  const hoje = new Date().toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Lisbon" });
  const ano = new Date().getFullYear();
  const footer = new Footer({ children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: TEAL, space: 4 } },
    children: [new TextRun({ text: "Condomínio Dinâmico, Lda · NIF 513 259 678 · Praça D. Paio Peres Correia, n.º 5, 2910-627 Setúbal · Tel. 265 754 179 · geral.dinamico@gmail.com", size: 16, color: "666666" })],
  })] });
  const sig = (l: string) => P(`${l}: ______________________________`, { after: 200 });

  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 21 } } } },
    numbering: { config: [{ reference: "b", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] }] },
    sections: [{
      properties: { page: { margin: { top: 1134, bottom: 1134, left: 1440, right: 1440 } } },
      footers: { default: footer },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1800, after: 600 }, children: [new ImageRun({ type: "png", data: logo, transformation: { width: 260, height: 260 }, altText: { title: "Logo", description: "Dinâmico", name: "logo" } })] }),
        P("PROPOSTA DE GESTÃO", { b: true, s: 48, c: TEAL, a: AlignmentType.CENTER, after: 200 }),
        P("Administração e Gestão do Edifício", { s: 28, a: AlignmentType.CENTER, after: 800 }),
        P(p.nome || "Condomínio", { b: true, s: 28, a: AlignmentType.CENTER }),
        P(p.morada, { a: AlignmentType.CENTER }),
        P(`Proposta n.º ${p.numero || "—"} · ${hoje}`, { c: "666666", a: AlignmentType.CENTER }),
        new Paragraph({ children: [new PageBreak()] }),

        H("Apresentação"),
        P("Exmos.(as) Senhores(as),"),
        P("É com o maior prazer que a equipa CONDOMÍNIO DINÂMICO – Administração de Condomínios, Lda., NIPC 513 259 678, com sede na Praça D. Paio Peres Correia, n.º 5, 2910-627 Setúbal, apresenta a presente proposta para a Administração e Gestão do Condomínio."),
        P("Procuramos satisfazer as necessidades de quem quer uma gestão profissional, próxima e transparente do seu imóvel: elaboração de orçamentos e balancetes, cobrança de quotas, acompanhamento da limpeza das partes comuns, pequenas reparações e resolução dos problemas do dia a dia."),
        P("Está a entregar a gestão do seu condomínio a alguém com rosto, que se pauta pelo profissionalismo e pela honestidade. Não se preocupe com nada — nós tratamos."),
        P("Atendimento: Praça D. Paio Peres Correia, n.º 5, Setúbal — terça a sexta, 09h–13h e 15h–18h · Tel. 265 754 179 / 961 106 805 · geral.dinamico@gmail.com"),

        H("Caracterização do edifício"),
        new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [4513, 4513], rows: [
          ["Frações habitacionais", p.fracoes], ["Lojas", p.lojas], ["Elevadores", p.elevadores],
          ["Garagens (box com portão)", p.garagens], ["Lugares de estacionamento", p.estacionamentos],
        ].map(([a, b]) => new TableRow({ children: [cell(String(a), 4513, { fill: "F4F9F9" }), cell(String(b), 4513, { right: true })] })) }),

        H("Administração"),
        P("(Art. 1436.º do Código Civil; Dec.-Lei 267/94 e 268/94, de 25 de outubro)", { c: "666666", s: 18 }),
        ...["Convocação e direção das assembleias de condomínio, de acordo com a legislação em vigor;", "Elaboração do orçamento anual de receitas e despesas;", "Contratação e acompanhamento dos seguros em condições vantajosas para os condóminos;", "Gestão de contas correntes: cobrança de receitas e pagamento das despesas comuns;", "Regulação do uso das partes comuns e prestação dos serviços de interesse comum;", "Prestação de contas à assembleia de condóminos;", "Arquivo organizado e digital de toda a documentação do condomínio;", "Pedidos de contadores de água e eletricidade em nome do condomínio."].map(B),
        H("Informática e transparência"),
        B("Plataforma digital com toda a informação do condomínio organizada (documentos, validades, assembleias);"),
        B("Avisos automáticos de prazos: seguros, contratos, inspeções de elevadores e convocatórias;"),
        B("Pagamentos sempre efetuados para a conta bancária do condomínio — transferência Multibanco, Homebanking ou débito em conta."),
        H("Jurídico"),
        ...["Esclarecimento de dúvidas relativas às partes comuns;", "Cobrança coerciva de quotas em atraso, com apoio de advogados e solicitadores;", "Mediação de conflitos em que o condomínio seja parte;", "Emissão de declarações de inexistência de dívida."].map(B),
        H("Financeiro"),
        ...["Pedido de cartão de pessoa coletiva e abertura de conta bancária;", "Elaboração do orçamento anual e mapa de quotas;", "Pagamento das despesas e cobrança de quotas;", "Apresentação de orçamentos para reabilitação e conservação das partes comuns."].map(B),
        H("Manutenção, prevenção e segurança"),
        ...[...(p.manutencao ? ["Visita técnica mensal ao edifício, com registo do que foi verificado e reparado;"] : []), "Rede de técnicos para manutenções e reparações (materiais e mão de obra cobrados à parte);", "Limpeza anual de caleiras;", "Fechaduras e molas de porta, substituição de vidros e iluminação das partes comuns."].map(B),
        ...(p.limpeza ? [H("Limpeza"), B(`Limpeza das partes comuns — ${p.limpezaFreq || "frequência a combinar"};`), B("Detergentes e materiais incluídos;"), B("Limpeza de garagem mecanizada sob consulta.")] : []),

        H("Valores da proposta"),
        tabela,
        P("Valores mensais. IVA à taxa legal em vigor (23%).", { c: "666666", s: 18 }),
        B("Uma assembleia ordinária anual e uma extraordinária estão incluídas na avença; as restantes são faturadas à parte;"),
        B("Despesas judiciais, custas e honorários de advogados ou solicitadores são pagos à parte;"),
        B("Materiais e mão de obra de reparações, afinações ou substituições são cobrados à parte."),

        H("Receção do condomínio"),
        P("Para o início da atividade necessitamos de:"),
        ...["Ata a nomear a Condomínio Dinâmico, Lda. como entidade administradora;", "Condições de movimentação da conta bancária do condomínio;", "Cópia da certidão predial com as frações e respetivas permilagens;", "Apólices de seguro individuais e/ou coletivas;", "Saldos, movimentos e mapa de quotas (incluindo dívidas dos condóminos);", "Listagem de proprietários: nomes, telefones, NIF, emails e moradas;", "Inventário de chaves, comandos, documentação e bens comuns."].map(B),

        new Paragraph({ children: [new PageBreak()] }),
        H("Aceitação da proposta"),
        P(`☐ Plano de gestão     ☐ Manutenção     Com limpeza: ☐ Sim  ☐ Não`, { after: 240 }),
        sig("Condomínio"), sig("NIPC"),
        ...Array.from({ length: 5 }, () => P("Assinatura: ______________________   Fração: ________", { after: 200 })),
        P(`Data: ___/___/${ano}`, { after: 200 }),
        sig("Condomínio Dinâmico, Lda"),
        P("A aceitação da presente proposta implica a vinculação contratual entre a Condomínio Dinâmico, Lda. e o Condomínio pelo período de doze meses, renovável por iguais e sucessivos períodos, salvo denúncia por qualquer das partes, por carta registada com aviso de receção, com a antecedência mínima de noventa dias.", { s: 18 }),
        P("Todas as páginas devem ser rubricadas.", { b: true, s: 18 }),
      ],
    }],
  });
  const blob = await Packer.toBlob(doc);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Proposta ${p.numero || ""} ${p.nome || "Condominio"}.docx`.replace(/\s+/g, " ").trim();
  a.click();
  URL.revokeObjectURL(a.href);
}
