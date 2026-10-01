import { createFileRoute } from "@tanstack/react-router";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
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

        // Chat ligado?
        const { data: cfg } = await supabaseAdmin
          .from("telegram_config")
          .select("chat_id")
          .eq("id", 1)
          .maybeSingle();
        if (!cfg?.chat_id) return Response.json({ ok: true, enviadas: 0, motivo: "sem chat" });
        const chatId = cfg.chat_id as number;

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

        const edIds = [...new Set((ass ?? []).map((a) => a.edificio_id))];
        const { data: eds } = await supabaseAdmin
          .from("edificios")
          .select("id,nome,identificacao_interna")
          .in("id", edIds.length ? edIds : ["00000000-0000-0000-0000-000000000000"]);
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
          if (!a.convocatoria_enviada && !a.avisada_convocatoria && dias >= 11 && dias <= 12) {
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

        return Response.json({ ok: true, enviadas, erros });
      },
    },
  },
});
