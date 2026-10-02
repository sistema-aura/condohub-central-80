import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { lerEmails, type Conta } from "./emails.server";

export const getEmails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conta: Conta | "ambos" }) => d)
  .handler(async ({ data }) => {
    try {
      const contas: Conta[] = data.conta === "ambos" ? ["geral", "condo"] : [data.conta];
      const listas = await Promise.all(contas.map((c) => lerEmails(50, undefined, c)));
      const todos = listas.flat();
      const cont = new Map<string, Set<string>>();
      for (const e of todos) cont.set(e.msgId, (cont.get(e.msgId) ?? new Set()).add(e.conta));
      let emails = todos.map((e) => ({ ...e, nasDuas: (cont.get(e.msgId)?.size ?? 0) > 1 }));
      if (data.conta === "ambos") {
        const vistos = new Set<string>();
        emails = emails.filter((e) => (vistos.has(e.msgId) ? false : (vistos.add(e.msgId), true)));
        emails.sort((a, b) => +new Date(b.data) - +new Date(a.data));
      }
      return { emails, erro: null as string | null };
    } catch (e) {
      console.error(e);
      return { emails: [], erro: e instanceof Error ? e.message : String(e) };
    }
  });

export const resumirEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { emailId: string; conta?: Conta }) => d)
  .handler(async ({ data }) => {
    const { lerEmailCompleto } = await import("./emails.server");
    const e = await lerEmailCompleto(data.emailId, data.conta);
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: [
          {
            role: "system",
            content:
              "És assistente de uma empresa de gestão de condomínios. Resume o email em português de Portugal, em 2 a 4 frases curtas: quem escreve, sobre que prédio/assunto, e o que a pessoa pede ou precisa que seja feito. Se houver prazos, valores ou pedidos concretos, menciona-os. Sê direto, sem introduções.",
          },
          { role: "user", content: `De: ${e.de}\nAssunto: ${e.assunto}\n\n${e.texto}` },
        ],
      }),
    });
    if (!res.ok) throw new Error(`IA erro [${res.status}]: ${await res.text()}`);
    const j = (await res.json()) as {
      output_text?: string;
      output?: { content?: { type: string; text?: string }[] }[];
    };
    const texto =
      j.output_text?.trim() ??
      j.output?.flatMap((o) => o.content ?? []).find((c) => c.type === "output_text")?.text?.trim();
    return { resumo: texto ?? "Sem resumo." };
  });

const TIPOS: Record<string, "elevador" | "seguro" | "banco" | "outros"> = {
  Elevadores: "elevador",
  Seguros: "seguro",
  Banco: "banco",
  "Comprovativos / Pagamentos": "banco",
};

export const guardarEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { emailId: string; edificioId: string; categoria: string; conta?: Conta }) => d)
  .handler(async ({ data, context }) => {
    const { lerEmailCompleto } = await import("./emails.server");
    const e = await lerEmailCompleto(data.emailId, data.conta);
    const sb = context.supabase;
    const tipo = TIPOS[data.categoria] ?? "outros";
    const info = `[gmail:${data.emailId}]\nEmail de ${e.de}\n${e.data}\n\n${e.texto}`;
    const dia = e.data ? new Date(e.data).toISOString().slice(0, 10) : null;
    const base = { edificio_id: data.edificioId, tipo, informacao: info, data_documento: dia, created_by: context.userId };
    if (!e.anexos.length) {
      const { error } = await sb.from("documentos").insert({ ...base, titulo: e.assunto || "Email" });
      if (error) throw new Error(error.message);
      return { anexos: 0 };
    }
    for (const a of e.anexos) {
      const path = `${data.edificioId}/${Date.now()}-${a.nome.replace(/[^\w.\-]/g, "_")}`;
      const up = await sb.storage.from("condominio-docs").upload(path, a.dados, { contentType: a.mime });
      if (up.error) throw new Error(up.error.message);
      const { error } = await sb.from("documentos").insert({
        ...base,
        titulo: `${e.assunto || "Email"} — ${a.nome}`,
        ficheiro_path: path,
        ficheiro_nome: a.nome,
        mime_type: a.mime,
        tamanho: a.dados.length,
      });
      if (error) throw new Error(error.message);
    }
    return { anexos: e.anexos.length };
  });
