const GW = "https://connector-gateway.lovable.dev/google_mail";

export type EmailItem = {
  id: string;
  de: string;
  assunto: string;
  data: string;
  resumo: string;
  categoria: string;
  edificioId: string | null;
  edificioNome: string | null;
  urgente: boolean;
};

const CATEGORIAS: [string, RegExp][] = [
  ["Elevadores", /elevador|ascensor|schindler|otis|thyssen|kone|orona/],
  ["Comprovativos / Pagamentos", /comprovativ|pagamento|transferencia|recibo|fatura|factura|mb way|referencia multibanco|quota/],
  ["Obras / Orçamentos", /obra|orcamento|reparac|empreiteir|infiltrac|canaliz|pintura|fachada/],
  ["Seguros", /seguro|apolice|sinistro|fidelidade|allianz|tranquilidade|ageas|generali/],
  ["Luz / Água / Gás", /edp|endesa|iberdrola|goldenergy|agua|smas|aguas|eletricidade|electricidade|gas /],
  ["Limpeza", /limpeza/],
  ["Assembleias / Convocatórias", /assembleia|convocatoria|reuniao|acta|ata /],
  ["Banco", /banco|millennium|caixa geral|cgd|santander|bpi|novo banco|montepio|extrato/],
];

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function classificar(txt: string) {
  for (const [c, re] of CATEGORIAS) if (re.test(txt)) return c;
  return "Outros";
}

type Ed = { id: string; nome: string; identificacao_interna: string | null };

function acharEdificio(txt: string, eds: Ed[]): Ed | null {
  const m = txt.match(/(?:predio|condominio|edificio|n\.?\s?º|nº)\s*0*(\d{1,3})\b/);
  if (m) {
    const n = Number(m[1]);
    const e = eds.find((e) => e.identificacao_interna && Number(e.identificacao_interna.replace(/\D/g, "")) === n);
    if (e) return e;
  }
  for (const e of eds) {
    const rua = norm(e.nome).split(/,|n\.?º|nº|\bn\b/)[0].trim();
    if (rua.length >= 10 && txt.includes(rua)) return e;
  }
  return null;
}

async function gw(path: string, init?: RequestInit) {
  const L = process.env.LOVABLE_API_KEY;
  const G = process.env.GOOGLE_MAIL_API_KEY;
  if (!L || !G) throw new Error("Gmail não está ligado");
  const res = await fetch(`${GW}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${L}`, "X-Connection-Api-Key": G, ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Gmail erro [${res.status}]: ${await res.text()}`);
  return res;
}

export async function lerEmails(max = 50, q = "in:inbox"): Promise<EmailItem[]> {
  const list = (await (await gw(`/gmail/v1/users/me/messages?maxResults=${max}&q=${encodeURIComponent(q)}`)).json()) as {
    messages?: { id: string }[];
  };
  const ids = (list.messages ?? []).map((m) => m.id);
  if (!ids.length) return [];

  const boundary = "batch_dinamico";
  const body =
    ids
      .map(
        (id) =>
          `--${boundary}\r\nContent-Type: application/http\r\n\r\nGET /gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date\r\n\r\n`,
      )
      .join("") + `--${boundary}--`;
  const res = await gw(`/batch/gmail/v1`, {
    method: "POST",
    headers: { "Content-Type": `multipart/mixed; boundary=${boundary}` },
    body,
  });
  const ct = res.headers.get("content-type") ?? "";
  const rb = ct.match(/boundary=("?)([^";]+)\1/)?.[2];
  if (!rb) throw new Error("Resposta inesperada do Gmail");
  const texto = await res.text();
  const msgs: { id: string; snippet?: string; payload?: { headers?: { name: string; value: string }[] } }[] = [];
  for (const part of texto.split(`--${rb}`)) {
    const st = part.match(/HTTP\/1\.1 (\d{3})/);
    if (!st || st[1] !== "200") continue;
    const i = part.indexOf("{");
    const j = part.lastIndexOf("}");
    if (i < 0) continue;
    try { msgs.push(JSON.parse(part.slice(i, j + 1))); } catch { /* ignora */ }
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: eds } = await supabaseAdmin.from("edificios").select("id,nome,identificacao_interna");

  return msgs.map((m) => {
    const h = (n: string) => m.payload?.headers?.find((x) => x.name.toLowerCase() === n.toLowerCase())?.value ?? "";
    const assunto = h("Subject");
    const resumo = (m.snippet ?? "").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
    const txt = norm(`${assunto} ${resumo}`);
    const ed = acharEdificio(txt, (eds ?? []) as Ed[]);
    return {
      id: m.id,
      de: h("From"),
      assunto,
      data: h("Date"),
      resumo,
      categoria: classificar(txt),
      edificioId: ed?.id ?? null,
      edificioNome: ed?.nome ?? null,
      urgente: /urgent/.test(txt),
    };
  });
}

type Part = { filename?: string; mimeType?: string; body?: { attachmentId?: string; size?: number; data?: string }; parts?: Part[] };

const b64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

export async function lerEmailCompleto(id: string) {
  const m = (await (await gw(`/gmail/v1/users/me/messages/${id}?format=full`)).json()) as {
    snippet?: string;
    payload?: Part & { headers?: { name: string; value: string }[] };
  };
  const h = (n: string) => m.payload?.headers?.find((x) => x.name.toLowerCase() === n)?.value ?? "";
  const anexos: { nome: string; mime: string; dados: Uint8Array }[] = [];
  let texto = "";
  const walk = async (p?: Part) => {
    if (!p) return;
    if (p.filename && p.body?.attachmentId) {
      const a = (await (await gw(`/gmail/v1/users/me/messages/${id}/attachments/${p.body.attachmentId}`)).json()) as { data: string };
      anexos.push({ nome: p.filename, mime: p.mimeType ?? "application/octet-stream", dados: b64(a.data) });
    } else if (!texto && p.mimeType === "text/plain" && p.body?.data) {
      texto = new TextDecoder().decode(b64(p.body.data));
    }
    for (const c of p.parts ?? []) await walk(c);
  };
  await walk(m.payload);
  return { assunto: h("subject"), de: h("from"), data: h("date"), texto: (texto || m.snippet || "").slice(0, 4000), anexos };
}
