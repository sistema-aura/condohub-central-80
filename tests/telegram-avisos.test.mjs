import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { telegramMessages } from "../src/lib/telegram-messages.ts";

const source = readFileSync(
  new URL("../src/routes/api/public/telegram/avisos.ts", import.meta.url),
  "utf8",
)
  .replace(
    'import { createFileRoute } from "@tanstack/react-router";',
    "const createFileRoute = () => (config) => config;",
  )
  .replace(
    'import { telegramMessages } from "@/lib/telegram-messages";',
    "const telegramMessages = globalThis.__telegramFormat;",
  )
  .replaceAll(
    'await import("@/integrations/supabase/client.server")',
    "({ supabaseAdmin: globalThis.__db })",
  )
  .replace('await import("@/lib/emails.server")', "({ lerEmails: async () => [] })");
globalThis.__telegramFormat = telegramMessages;
const { Route } = await import(
  "data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(source)).toString("base64")
);
const chats = [
  { chat_id: 1, chat_title: "dina" },
  { chat_id: 2, chat_title: "eduardo" },
];
function fixture(tables, valid = true) {
  const writes = [];
  globalThis.__db = {
    rpc: async () => ({ data: valid }),
    from(table) {
      let patch, column;
      const q = {
        select() {
          return q;
        },
        eq() {
          return q;
        },
        neq() {
          return q;
        },
        gt() {
          return q;
        },
        gte() {
          return q;
        },
        lte() {
          return q;
        },
        order(c) {
          column = c;
          return q;
        },
        update(p) {
          patch = p;
          return q;
        },
        in() {
          return q;
        },
        then(resolve) {
          if (patch) writes.push({ table, patch });
          let data = [...(tables[table] ?? [])];
          if (column === "data_hora") data.sort((a, b) => a.data_hora.localeCompare(b.data_hora));
          return Promise.resolve({ data, error: null }).then(resolve);
        },
      };
      return q;
    },
  };
  return writes;
}
const call = (headers = {}) =>
  Route.server.handlers.POST({
    request: new Request("https://example.test/api/public/telegram/avisos", {
      method: "POST",
      headers: { "x-avisos-token": "test", ...headers },
    }),
  });
process.env.LOVABLE_API_KEY = "test";
process.env.TELEGRAM_API_KEY = "test";

test("rejects invalid cron token without contacting Telegram", async () => {
  fixture({}, false);
  globalThis.fetch = async () => {
    throw Error("must not send");
  };
  assert.equal((await call()).status, 401);
});
test("one chronological invitation digest per chat, delivery before database acknowledgement", async () => {
  const date = (days) => new Date(Date.now() + days * 86400000).toISOString();
  const writes = fixture({
    telegram_config: chats,
    edificios: [{ id: "b", nome: "Prédio & Filhos" }],
    assembleias: [
      { id: "later", edificio_id: "b", data_hora: date(10), convocatoria_enviada: false },
      { id: "first", edificio_id: "b", data_hora: date(5), convocatoria_enviada: false },
    ],
  });
  const sent = [];
  globalThis.fetch = async (_, options) => {
    assert.equal(writes.length, 0);
    sent.push(JSON.parse(options.body));
    return Response.json({ ok: true });
  };
  assert.equal((await call()).status, 200);
  assert.equal(sent.length, 2);
  assert.ok(sent.every((m) => m.text.includes("CONVOCATÓRIAS POR ENVIAR (2)")));
  assert.equal(writes.length, 1);
});
test("agenda groups sections while preserving recipient filtering and declarations", async () => {
  fixture({
    telegram_config: chats,
    tarefas: [
      { titulo: "Só Dina", para_pessoa: "Dina", de_pessoa: "Eduardo", estado: "pendente" },
      { titulo: "Só Eduardo", para_pessoa: "Eduardo", de_pessoa: "Dina", estado: "pendente" },
    ],
    declaracoes: [{ fracao: "R/C", urgente: true }],
    vistorias: [],
  });
  const sent = [];
  globalThis.fetch = async (_, options) => {
    sent.push(JSON.parse(options.body));
    return Response.json({ ok: true });
  };
  await call({ "x-modo": "agenda" });
  assert.equal(sent.length, 2);
  assert.ok(sent[0].text.includes("Só Dina") && !sent[0].text.includes("Só Eduardo"));
  assert.ok(sent[1].text.includes("Só Eduardo") && !sent[1].text.includes("Só Dina"));
  assert.ok(sent.every((m) => m.text.includes("Declarações por fazer")));
});
test("a failed destination is not acknowledged and other destinations still receive", async () => {
  const writes = fixture({
    telegram_config: chats,
    assembleias: [
      {
        id: "a",
        edificio_id: "b",
        data_hora: new Date(Date.now() + 5 * 86400000).toISOString(),
        convocatoria_enviada: false,
      },
    ],
  });
  const sent = [];
  globalThis.fetch = async (_, options) => {
    const m = JSON.parse(options.body);
    sent.push(m.chat_id);
    return Response.json({ ok: m.chat_id !== 1 });
  };
  const result = await (await call()).json();
  assert.equal(result.erros.length, 1);
  assert.deepEqual(sent.sort(), [1, 2]);
  assert.equal(writes.length, 0);
});
