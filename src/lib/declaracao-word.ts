import JSZip from "jszip";

type Edificio = { nome: string; identificacao_interna: string | null; morada: string | null; codigo_postal: string | null; localidade: string | null; observacoes: string | null };
type Declaracao = { fracao: string | null; proprietario: string | null; nif: string | null; quota_mensal: string | null; fundo_reserva: string | null; quota_seguro: string | null; quota_extraordinaria: string | null };

const NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export async function descarregarDeclaracao(edificio: Edificio, declaracao: Declaracao) {
  // Edit the supplied Word package itself: its page, typography, logo, table and footer remain intact.
  const response = await fetch("/modelo-declaracao.docx");
  if (!response.ok) throw new Error("Não foi possível abrir o modelo Word.");
  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const original = zip.file("word/document.xml");
  if (!original) throw new Error("O modelo Word está incompleto.");
  const xml = new DOMParser().parseFromString(await original.async("string"), "application/xml");
  if (xml.getElementsByTagName("parsererror").length) throw new Error("Não foi possível ler o modelo Word.");

  const paragraphs = Array.from(xml.getElementsByTagNameNS(NS, "p"));
  const texts = (p: Element) => Array.from(p.getElementsByTagNameNS(NS, "t"));
  const content = (p: Element) => texts(p).map((t) => t.textContent ?? "").join("");
  const paragraph = (prefix: string) => {
    const found = paragraphs.find((p) => content(p).startsWith(prefix));
    if (!found) throw new Error("O modelo Word não tem todos os campos esperados.");
    return found;
  };
  const replaceRuns = (prefix: string, values: Record<number, string>) => {
    const runs = texts(paragraph(prefix));
    for (const [index, value] of Object.entries(values)) {
      const run = runs[Number(index)];
      if (!run) throw new Error("Um campo do modelo Word não foi encontrado.");
      run.textContent = value;
      if (/^\s|\s$/.test(value)) run.setAttribute("xml:space", "preserve");
    }
  };
  const required = (value: string | null | undefined, label: string) => {
    if (!value?.trim()) throw new Error(`Falta preencher ${label} antes de gerar a declaração.`);
    return value.trim();
  };
  const now = new Date();
  const lisbon = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Lisbon", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(now);
  const parts = Object.fromEntries(lisbon.map(({ type, value }) => [type, Number(value)]));
  const day = parts.day;
  const month = parts.month;
  const year = parts.year;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const nipc = edificio.observacoes?.match(/NIPC[:\s]*([\d ]{9,11})/i)?.[1]?.trim();

  // Each replacement targets a text run already present in the supplied file.
  replaceRuns("Para os devidos efeitos", {
    2: required(edificio.nome, "o nome do prédio"),
    5: [edificio.morada, edificio.codigo_postal].filter(Boolean).join(", ") || "___________",
    7: edificio.localidade || "___________",
    10: `${nipc || "___________"} `,
    15: required(declaracao.proprietario, "o proprietário"),
    18: required(declaracao.nif, "o NIF"),
    21: required(declaracao.fracao, "a fração") + " ",
    25: ` ${day}`,
    29: meses[month - 1],
    32: ` ${String(year).slice(0, -1)}`,
    33: String(year).slice(-1),
  });
  replaceRuns("Tem a sua situação regularizada", {
    1: String(lastDay),
    4: `${meses[month - 1]} `,
    6: ` ${String(year).slice(0, -1)}`,
    7: String(year).slice(-1),
  });
  replaceRuns("Identificação da Fração", {}); // Assert the original table is present.
  replaceRuns("_ – _º __", { 0: required(declaracao.fracao, "a fração"), 1: "", 2: "", 3: "", 4: "", 5: "", 6: "" });
  replaceRuns("__,__€", { 0: required(declaracao.quota_mensal, "a quota mensal"), 1: "", 2: "" });
  replaceRuns("_,_ €", { 0: required(declaracao.fundo_reserva, "o fundo comum de reserva"), 1: "", 2: "" });
  const nada = paragraphs.filter((p) => content(p) === "Nada em vigor");
  if (nada.length < 2) throw new Error("A tabela do modelo Word está incompleta.");
  texts(nada[0])[0].textContent = required(declaracao.quota_seguro, "a quota de seguro");
  texts(nada[1])[0].textContent = required(declaracao.quota_extraordinaria, "a quota extraordinária");
  replaceRuns("Setúbal, ", {
    1: String(day),
    3: `${meses[month - 1]} `,
    5: ` ${String(year).slice(0, -1)}`,
    6: String(year).slice(-1),
  });

  zip.file("word/document.xml", new XMLSerializer().serializeToString(xml));
  const blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const filenamePart = (value: string) => value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/\s+/g, "_").replace(/[. ]+$/, "");
  const codigo = filenamePart(edificio.identificacao_interna || edificio.nome || "predio");
  const fracao = filenamePart(required(declaracao.fracao, "a fração"));
  link.download = `${/^\d+$/.test(codigo) ? codigo.padStart(3, "0") : codigo}_Declaração_dnd_${fracao}.docx`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}