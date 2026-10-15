import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      GET: async () => Response.json({ service: "condohub-telegram", version: 1 }),
      POST: async ({ request }) => {
        const { webhookSecret } = await import("@/lib/telegram-gateway.server");
        if (request.headers.get("x-telegram-bot-api-secret-token") !== (await webhookSecret()))
          return new Response("Unauthorized", { status: 401 });
        const raw = await request.text();
        if (raw.length > 65536) return new Response("Too large", { status: 413 });
        let update;
        try {
          update = JSON.parse(raw);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        try {
          const { handleTelegramUpdate } = await import("@/lib/telegram-bot.server");
          await handleTelegramUpdate(update);
          return Response.json({ ok: true });
        } catch {
          return new Response("Temporary error", { status: 500 });
        }
      },
    },
  },
});
