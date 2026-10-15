import { test } from "node:test";
import assert from "node:assert/strict";
import { telegramMessages } from "../src/lib/telegram-messages.ts";
const base = "https://condohub-central-80.lovable.app";
test("keeps untrusted building text literal and uses valid UTF-16 bold offsets", () => {
  const text = "📌 RESUMO\n\n📝 Declarações\n🏢 A & B <b>prédio</b>\nFração: 😀";
  const [message] = telegramMessages(text, base);
  assert.equal(message.text, text);
  assert.equal(message.parse_mode, undefined);
  assert.equal(
    message.text.slice(
      message.entities[1].offset,
      message.entities[1].offset + message.entities[1].length,
    ),
    "📝 Declarações",
  );
  assert.equal(message.reply_markup.inline_keyboard[0][0].url, base + "/declaracoes");
});
test("long digests retain every character and never split surrogate pairs", () => {
  for (const text of [
    "📌 Resumo\n\n" + "🏢 Condomínio & Filhos\n📅 15/10/2026\n\n".repeat(250),
    "😀".repeat(4000),
  ]) {
    const messages = telegramMessages(text, base);
    assert.ok(messages.length > 1);
    assert.equal(messages.map((m) => m.text.replace(/^📄 \d+\/\d+\n\n/, "")).join(""), text);
    for (const m of messages) {
      assert.ok(m.text.length <= 4096);
      assert.ok(!/[\uD800-\uDBFF]$/.test(m.text));
      assert.ok(m.reply_markup.inline_keyboard.length);
    }
  }
});
test("summary buttons cover every included section and building links target actual route", () => {
  const [m] = telegramMessages(
    "📋 Agenda\n📝 Declarações\n🔧 Vistorias\n📅 Assembleias",
    base,
    "id-123",
  );
  assert.deepEqual(
    m.reply_markup.inline_keyboard.filter((row) => "url" in row[0]).map((row) => new URL(row[0].url).pathname),
    ["/edificios/id-123", "/assembleias", "/declaracoes", "/agenda", "/vistorias"],
  );
  assert.throws(() => telegramMessages("Teste", "http://example.com"));
});
