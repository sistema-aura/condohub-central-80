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
        const { data: cfgs } = await supabaseAdmin.from("telegram_config").select("chat_id");
        const chats = (cfgs ?? []).map((c) => c.chat_id as number);
        if (!chats.length) return Response.json({ ok: true, enviadas: 0, motivo: "sem chat" });
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
          if (!a.convocatoria_enviada && !a.avisada_convocatoria && ((dias >= 11 && dias <= 12) || dias === 15)) {
            avisos.push({
              text: `📨 Convocatória por enviar\n${nome}\nReunião: ${quando}`,
              col: "avisada_convocatoria",
            });
          }
          if (!a.avisada_reuniao && dias >= 0 && dias <= 2) {
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
              `⚠️ Contrato acaba em ${dias} dias (TESTE)\n${nomeEd(d.edificio_id as string)}\n${d.titulo}\nValidade: ${dd}/${m}/${y}\nÉ preciso cancelar ou renovar.`,
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

        // Declarações por fazer: lembrete diário só ao Leo (passagem da manhã)
        const horaLx = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Lisbon", hour: "2-digit", hour12: false }).format(new Date()));
        if (horaLx < 12) {
          const { data: leoCfg } = await supabaseAdmin.from("telegram_config").select("chat_id").ilike("chat_title", "leo");
          const { data: decs } = await supabaseAdmin
            .from("declaracoes")
            .select("edificio_id,fracao,urgente,reconhecida")
            .eq("feita", false);
          if (leoCfg?.length && decs?.length) {
            const linhas = decs.map((d) => `• ${nomeEd(d.edificio_id as string)}${d.fracao ? ` – ${d.fracao}` : ""}${d.urgente ? " ⚡URGENTE" : ""}${d.reconhecida ? " (reconhecida)" : ""}`);
            try {
              for (const c of leoCfg) await sendOne(c.chat_id as number, `📝 Declarações por fazer (${decs.length})\n${linhas.join("\n")}`);
              enviadas++;
            } catch (e) {
              erros.push(e instanceof Error ? e.message : String(e));
            }
          }
        }

        return Response.json({ ok: true, enviadas, erros });
      },
    },
  },
});
