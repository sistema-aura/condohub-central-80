const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";
export async function gatewayCall<T = unknown>(path: string, body?: unknown): Promise<T> {
  const key = process.env.LOVABLE_API_KEY;
  const connection = process.env.TELEGRAM_API_KEY;
  if (!key || !connection) throw new Error("O bot do Telegram não está configurado");
  const response = await fetch(`${GATEWAY_URL}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      "X-Connection-Api-Key": connection,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json()) as { ok: boolean; result: T; description?: string };
  if (!response.ok || !data.ok) {
    // Gateway responses can contain request credentials. Never relay the raw response.
    if (data.description?.includes("message is not modified")) return undefined as T;
    throw new Error(`Não foi possível comunicar com o Telegram (${response.status}).`);
  }
  return data.result;
}
export function appUrl() {
  const url = new URL(process.env.TELEGRAM_APP_URL || "https://condohub-central-80.lovable.app");
  if (url.protocol !== "https:") throw new Error("TELEGRAM_APP_URL deve usar HTTPS");
  return url.origin;
}
export async function webhookSecret() {
  if (!process.env.TELEGRAM_API_KEY) throw new Error("Telegram não configurado");
  const bytes = new TextEncoder().encode(`condohub-webhook-v1:${process.env.TELEGRAM_API_KEY}`);
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
