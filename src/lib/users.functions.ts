import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Public: is there already at least one account? Used to gate first-run setup. */
export const getSetupStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) throw new Error(error.message);
  return { hasUsers: (data.users?.length ?? 0) > 0 };
});

/** Public but single-use: creates the very first account, only while none exists. */
export const createFirstUser = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; password: string }) => {
    const email = String(input.email ?? "").trim().toLowerCase();
    const password = String(input.password ?? "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 255) {
      throw new Error("Email inválido");
    }
    if (password.length < 6 || password.length > 72) {
      throw new Error("A password deve ter pelo menos 6 caracteres");
    }
    return { email, password };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const existing = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (existing.error) throw new Error(existing.error.message);
    if ((existing.data.users?.length ?? 0) > 0) {
      throw new Error("Já existe uma conta. Peça a um administrador para criar a sua.");
    }
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAppUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error(error.message);
    return (data.users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? "",
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
    }));
  });

export const createAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; password: string }) => {
    const email = String(input.email ?? "").trim().toLowerCase();
    const password = String(input.password ?? "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 255) {
      throw new Error("Email inválido");
    }
    if (password.length < 6 || password.length > 72) {
      throw new Error("A password deve ter pelo menos 6 caracteres");
    }
    return { email, password };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => ({ userId: String(input.userId) }))
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) throw new Error("Não pode remover a sua própria conta.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
