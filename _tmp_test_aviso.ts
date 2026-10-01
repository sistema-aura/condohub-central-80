import { supabaseAdmin } from "@/integrations/supabase/client.server";

const { data: rows, error } = await supabaseAdmin
  .schema("private")
  .from("app_secrets")
  .select("value")
  .eq("key", "telegram_cron");
if (error || !rows?.length) {
  console.log("token read error:", error?.message ?? "sem token");
  process.exit(1);
}
const res = await fetch("http://localhost:8080/api/public/telegram/avisos", {
  method: "POST",
  headers: { "x-avisos-token": rows[0].value },
  body: "{}",
});
console.log("status:", res.status, "body:", await res.text());
