import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

function load(file) {
  const source = fs.readFileSync(file, "utf8");
  return `data:text/javascript;base64,${Buffer.from(ts.transpile(source, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  })).toString("base64")}`;
}

const crypto = await import(load("apps/cms/src/crypto.ts"));
const token = crypto.randomToken();
assert.match(token, /^[a-f0-9]{64}$/);
assert.equal(crypto.equal("same", "same"), true);
assert.equal(crypto.equal("same", "different"), false);

const salt = crypto.randomToken();
const hash = await crypto.passwordHash("a sufficiently long test password", salt);
assert.equal(hash, await crypto.passwordHash("a sufficiently long test password", salt));
assert.notEqual(hash, await crypto.passwordHash("a sufficiently long test passphrase", salt));
assert.notEqual(hash, await crypto.passwordHash("a sufficiently long test password", crypto.randomToken()));

console.log("PASS: backend authentication crypto primitives.");
