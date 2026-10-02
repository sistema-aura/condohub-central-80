import { createFileRoute } from "@tanstack/react-router";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

async function sendOne(chatId: number, text: string): Promise<void> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) throw new Error("Telegram não configurado");
  const res = await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TELEGRAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  const bodyText = await res.text();
  if (!res.ok) throw new Error(`Telegram [${res.status}]: ${bodyText}`);
  const json = JSON.parse(bodyText) as { ok: boolean; description?: string };
  if (!json.ok) throw new Error(json.description ?? "Erro do Telegram");
}

export const Route = createFileRoute("/api/public/telegram/avisos")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Verifica o código secreto que o aviso diário envia no cabeçalho.
        const token = request.headers.get("x-avisos-token") ?? "";
        if (!token) return new Response("Unauthorized", { status: 401 });
        const { data: valid, error: rpcError } = await supabaseAdmin.rpc("check_avisos_token", { _token: token });
        if (rpcError || valid !== true) return new Response("Unauthorized", { status: 401 });

        // Chats ligados (todos recebem)
        const { data: cfgs } = await supabaseAdmin.from("telegram_config").select("chat_id,chat_title");
        const chats = (cfgs ?? []).map((c) => c.chat_id as number);
        if (!chats.length) return Response.json({ ok: true, enviadas: 0, motivo: "sem chat" });
        // Pessoa da empresa associada a cada chat (leo=Leonor, dina=Dina, eduardo=Eduardo)
        const CHAT_PESSOA: Record<string, string> = { leo: "Leonor", dina: "Dina", eduardo: "Eduardo" };
        const chatPessoa = new Map<number, string>();
        for (const c of cfgs ?? []) {
          const p = CHAT_PESSOA[String(c.chat_title ?? "").trim().toLowerCase()];
          if (p) chatPessoa.set(c.chat_id as number, p);
        }
        const chatId = 0;
        const sendTelegramMessage = async (_id: number, text: string) => {
          for (const c of chats) await sendOne(c, text);
        };

        // Datas no fuso de Lisboa
        const fmtDia = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Europe/Lisbon",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        const fmtData = new Intl.DateTimeFormat("pt-PT", {
          timeZone: "Europe/Lisbon",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const fmtHora = new Intl.DateTimeFormat("pt-PT", {
          timeZone: "Europe/Lisbon",
          hour: "2-digit",
          minute: "2-digit",
        });
        const hojeMs = Date.parse(`${fmtDia.format(new Date())}T00:00:00Z`);
        const diasAte = (iso: string) =>
          (Date.parse(`${fmtDia.format(new Date(iso))}T00:00:00Z`) - hojeMs) / 86400000;

        const agora = new Date().toISOString();

        // Modo Agenda (10:30, 15:30, 17:00): tarefas da agenda + declarações por fazer
        if (request.headers.get("x-modo") === "agenda") {
          const { data: eds } = await supabaseAdmin.from("edificios").select("id,nome,identificacao_interna");
          const ed = (id: string | null) => {
            const e = (eds ?? []).find((x) => x.id === id);
            return e ? `${e.identificacao_interna ? e.identificacao_interna + " – " : ""}${e.nome}` : "";
          };
          const ESTADO: Record<string, string> = { pendente: "🕓 Por ver", visto: "👀 Visto", em_curso: "🚶 No prédio", };
          const { data: tars } = await supabaseAdmin.from("tarefas").select("titulo,edificio_id,de_pessoa,para_pessoa,estado,prioridade,prazo,avisar_pessoas").neq("estado", "concluida").order("prazo", { nullsFirst: false });
          const { data: decs } = await supabaseAdmin.from("declaracoes").select("edificio_id,fracao,urgente,reconhecida").eq("feita", false);
          const { data: vists } = await supabaseAdmin.from("vistorias").select("edificio_id,data,notas,avisar_pessoas").eq("concluida", false).neq("avisar_pessoas", []);
          const linhaTarefa = (t: (typeof tars extends (infer U)[] | null ? U : never)) =>
            `• ${t.prioridade ? "⚡" : ""}${t.titulo}${t.edificio_id ? ` (${ed(t.edificio_id)})` : ""}\n   ${t.de_pessoa} → ${t.para_pessoa} · ${ESTADO[t.estado] ?? t.estado}${t.prazo ? ` · até ${fmtData.format(new Date(t.prazo + "T12:00:00Z"))}` : ""}`;
          // Pessoas que recebem os avisos de cada tarefa: as escolhidas ao criar;
          // se não foi escolhido ninguém, vai para a pessoa a quem a tarefa se destina.
          const destinatarios = (t: { para_pessoa: string; avisar_pessoas: string[] | null }) =>
            t.avisar_pessoas && t.avisar_pessoas.length ? t.avisar_pessoas : [t.para_pessoa];
          let msgDecs: string | null = null;
          if (decs?.length) {
            const linhas = decs.map((d) => `• ${ed(d.edificio_id as string)}${d.fracao ? ` – ${d.fracao}` : ""}${d.urgente ? " ⚡URGENTE" : ""}${d.reconhecida ? " (reconhecida)" : ""}`);
            msgDecs = `📝 Declarações por fazer (${decs.length})\n${linhas.join("\n")}`;
          }
          const errs: string[] = [];
          let enviadasAgenda = 0;
          for (const c of chats) {
            const pessoa = chatPessoa.get(c);
            // Tarefas deste chat: só as marcadas para esta pessoa (ou sem destinatário conhecido vão para todos)
            const minhas = (tars ?? []).filter((t) => {
              const dest = destinatarios(t as { para_pessoa: string; avisar_pessoas: string[] | null });
              if (!pessoa) return true; // chat sem pessoa associada recebe tudo
              return dest.includes(pessoa);
            });
            const msgs: string[] = [];
            if (minhas.length) msgs.push(`📋 Agenda – por concluir (${minhas.length})\n${minhas.map(linhaTarefa).join("\n")}`);
            const vMinhas = (vists ?? []).filter((v) => !pessoa || (v.avisar_pessoas ?? []).includes(pessoa));
            if (vMinhas.length) msgs.push(`🔧 Vistorias por concluir (${vMinhas.length})\n${vMinhas.map((v) => `• ${ed(v.edificio_id)} · ${fmtData.format(new Date(v.data + "T12:00:00Z"))}${v.notas ? `\n   📝 ${v.notas.slice(0, 200)}` : ""}`).join("\n")}`);
            if (msgDecs) msgs.push(msgDecs);
            if (!msgs.length) msgs.push(`✅ Aviso da Agenda das ${fmtHora.format(new Date())} correu: sem tarefas nem declarações por fazer.`);
            for (const m of msgs) {
              try { await sendOne(c, m.slice(0, 4000)); enviadasAgenda++; } catch (e) { errs.push(String(e)); }
            }
          }
          return Response.json({ ok: true, enviadas: enviadasAgenda, erros: errs });
        }
        const { data: ass, error: assErr } = await supabaseAdmin
          .from("assembleias")
          .select("id,data_hora,convocatoria_enviada,avisada_convocatoria,avisada_reuniao,edificio_id")
          .gt("data_hora", agora);
        if (assErr) return Response.json({ error: assErr.message }, { status: 500 });

        const { data: eds } = await supabaseAdmin
          .from("edificios")
          .select("id,nome,identificacao_interna");
        const nomeEd = (id: string) => {
          const e = (eds ?? []).find((x) => x.id === id);
          if (!e) return "Prédio";
          return e.identificacao_interna ? `${e.identificacao_interna} · ${e.nome}` : e.nome;
        };

        let enviadas = 0;
        const erros: string[] = [];
        for (const a of ass ?? []) {
          const dias = diasAte(a.data_hora as string);
          const quando = `${fmtData.format(new Date(a.data_hora as string))} às ${fmtHora.format(new Date(a.data_hora as string))}`;
          const nome = nomeEd(a.edificio_id as string);

          const avisos: Array<{ text: string; col: "avisada_convocatoria" | "avisada_reuniao" }> = [];
          if (!a.convocatoria_enviada && dias >= 0 && dias <= 15) {
            avisos.push({
              text: `📨 Convocatória por enviar\n${nome}\nReunião: ${quando}`,
              col: "avisada_convocatoria",
            });
          }
          if (dias >= 0 && dias <= 2) {
            avisos.push({ text: `📅 Reunião em breve\n${nome}\n${quando}`, col: "avisada_reuniao" });
          }

          for (const av of avisos) {
            try {
              await sendTelegramMessage(chatId, av.text);
              enviadas++;
              const patch =
                av.col === "avisada_convocatoria"
                  ? { avisada_convocatoria: true }
                  : { avisada_reuniao: true };
              const { error: upErr } = await supabaseAdmin
                .from("assembleias")
                .update(patch)
                .eq("id", a.id as string);
              if (upErr) erros.push(upErr.message);
            } catch (e) {
              erros.push(e instanceof Error ? e.message : String(e));
            }
          }
        }

        // Documentos a expirar: aviso entre 95 e 90 dias antes (aos 90 tem de estar decidido cancelar ou renovar)
        const limiteMax = new Date(hojeMs + 95 * 86400000).toISOString().slice(0, 10);
        const limiteMin = new Date(hojeMs + 90 * 86400000).toISOString().slice(0, 10);
        const { data: docs } = await supabaseAdmin
          .from("documentos")
          .select("id,titulo,edificio_id,data_validade,avisada_validade")
          .gte("data_validade", limiteMin)
          .lte("data_validade", limiteMax)
          .eq("avisada_validade", false);
        for (const d of docs ?? []) {
          try {
            const dias = diasAte(d.data_validade as string);
            const [y, m, dd] = (d.data_validade as string).split("-");
            await sendTelegramMessage(
              chatId,
              `⚠️ Contrato acaba em ${dias} dias\n${nomeEd(d.edificio_id as string)}\n${d.titulo}\nValidade: ${dd}/${m}/${y}\nÉ preciso cancelar ou renovar.`,
            );
            enviadas++;
            const { error: markErr } = await supabaseAdmin
              .from("documentos")
              .update({ avisada_validade: true })
              .eq("id", d.id as string);
            if (markErr) erros.push(markErr.message);
          } catch (e) {
            erros.push(e instanceof Error ? e.message : String(e));
          }
        }

        // Declarações por fazer: lembrete diário a todos os chats (passagem da manhã)
        const horaLx = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Lisbon", hour: "2-digit", hour12: false }).format(new Date()));
        if (horaLx < 0 || request.headers.get("x-forcar-declaracoes") === "1") {
          const { data: decs } = await supabaseAdmin
            .from("declaracoes")
            .select("edificio_id,fracao,urgente,reconhecida")
            .eq("feita", false);
          if (chats.length && decs?.length) {
            const linhas = decs.map((d) => `• ${nomeEd(d.edificio_id as string)}${d.fracao ? ` – ${d.fracao}` : ""}${d.urgente ? " ⚡URGENTE" : ""}${d.reconhecida ? " (reconhecida)" : ""}`);
            try {
              for (const c of chats) await sendOne(c, `📝 Declarações por fazer (${decs.length})\n${linhas.join("\n")}`);
              enviadas++;
            } catch (e) {
              erros.push(e instanceof Error ? e.message : String(e));
            }
          }
        }

        // Emails urgentes (últimos 2 dias) nas duas caixas, cada um avisado uma vez
        try {
          const { lerEmails } = await import("@/lib/emails.server");
          const contas = ["geral", "condo"] as const;
          const urg: { chave: string; conta: string; assunto: string; de: string; edificioNome?: string | null; resumo: string }[] = [];
          for (const conta of contas) {
            try {
              const lista = await lerEmails(30, "newer_than:2d", conta);
              for (const e of lista.filter((x) => x.urgente)) {
                urg.push({ chave: `${conta}:${e.id}`, conta, assunto: e.assunto, de: e.de, edificioNome: e.edificioNome, resumo: e.resumo });
              }
            } catch (e) {
              erros.push(e instanceof Error ? e.message : String(e));
            }
          }
          if (urg.length) {
            const { data: ja } = await supabaseAdmin.from("email_avisados").select("id").in("id", urg.map((e) => e.chave));
            const jaSet = new Set((ja ?? []).map((r) => r.id));
            for (const e of urg.filter((x) => !jaSet.has(x.chave))) {
              for (const c of chats) await sendOne(c, `🚨 Email URGENTE (${e.conta === "condo" ? "condominiodinamico" : "geral.dinamico"})\n${e.assunto}\nDe: ${e.de}${e.edificioNome ? `\nPrédio: ${e.edificioNome}` : ""}\n${e.resumo.slice(0, 200)}`);
              await supabaseAdmin.from("email_avisados").insert({ id: e.chave });
              enviadas++;
            }
          }
        } catch (e) {
          erros.push(e instanceof Error ? e.message : String(e));
        }

        if (enviadas === 0 && !erros.length && request.headers.get("x-sem-resumo") !== "1") {
          try {
            for (const c of chats) await sendOne(c, `✅ Verificação das ${fmtHora.format(new Date())}: sem avisos pendentes.`);
          } catch (e) {
            erros.push(e instanceof Error ? e.message : String(e));
          }
        }

        return Response.json({ ok: true, enviadas, erros });
      },
    },
  },
});
