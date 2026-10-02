import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { lerEmails } from "./emails.server";

export const getEmails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    try {
      return { emails: await lerEmails(50), erro: null as string | null };
    } catch (e) {
      console.error(e);
      return { emails: [], erro: e instanceof Error ? e.message : String(e) };
    }
  });
