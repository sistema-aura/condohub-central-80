import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseCallback,
  canAccess,
  isPending,
  actionButtons,
} from "../src/lib/telegram-interactions.ts";
const id = "00000000-0000-4000-8000-000000000001";
test("only known operations and exact UUIDs are accepted", () => {
  for (const bad of [
    "open:__proto__:" + id,
    "open:toString:" + id,
    "done:t:../../secret",
    "confirm:" + id + ":extra",
    "list:t:0:extra",
    "list:t:-1",
    "h2:t:" + id,
  ])
    assert.equal(parseCallback(bad), null);
  assert.equal(parseCallback("confirm:" + id).token, id);
  assert.equal(parseCallback("h24:t:" + id).kind, "t");
  for (const row of actionButtons("a", id, id))
    for (const b of row)
      if ("callback_data" in b) assert.ok(Buffer.byteLength(b.callback_data) <= 64);
});
test("personal tasks and inspections respect recipient selection", () => {
  assert.equal(canAccess("t", { para_pessoa: "Dina", avisar_pessoas: [] }, "eduardo"), false);
  assert.equal(
    canAccess("t", { para_pessoa: "Dina", avisar_pessoas: ["Eduardo"] }, "eduardo"),
    true,
  );
  assert.equal(canAccess("v", { avisar_pessoas: ["Dina"] }, "leo"), false);
  assert.equal(canAccess("d", {}, "dina"), true);
});
test("completed, cancelled or past items cannot be completed or reminded again", () => {
  assert.equal(isPending("d", { feita: true }), false);
  assert.equal(isPending("t", { estado: "concluida" }), false);
  assert.equal(isPending("v", { concluida: true }), false);
  assert.equal(
    isPending("a", { cancelada: true, data_hora: new Date(Date.now() + 86400000).toISOString() }),
    false,
  );
  assert.equal(isPending("a", { data_hora: "2000-01-01" }), false);
});
