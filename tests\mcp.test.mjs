import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import readline from "node:readline";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const server = path.join(root, "plugins", "ynab-chatgpt", "scripts", "ynab-mcp.mjs");

async function session() {
  const child = spawn(process.execPath, [server], {
    env: { ...process.env, YNAB_ACCESS_TOKEN: "" },
    stdio: ["pipe", "pipe", "pipe"]
  });
  const lines = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
  const iterator = lines[Symbol.asyncIterator]();
  return {
    child,
    async request(payload) {
      child.stdin.write(`${JSON.stringify(payload)}\n`);
      const { value } = await iterator.next();
      return JSON.parse(value);
    },
    async close() {
      child.stdin.end();
      await once(child, "exit");
    }
  };
}

test("initializes and advertises all YNAB tools", async () => {
  const mcp = await session();
  try {
    const initialized = await mcp.request({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-03-26" }
    });
    assert.equal(initialized.result.serverInfo.name, "ynab-chatgpt");

    const listed = await mcp.request({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    assert.deepEqual(
      listed.result.tools.map((tool) => tool.name).sort(),
      [
        "ynab_create_transaction",
        "ynab_get_budget",
        "ynab_list_accounts",
        "ynab_list_budgets",
        "ynab_list_categories",
        "ynab_list_months",
        "ynab_list_payees",
        "ynab_list_transactions"
      ]
    );
  } finally {
    await mcp.close();
  }
});

test("returns a safe error when the token is absent", async () => {
  const mcp = await session();
  try {
    const response = await mcp.request({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "ynab_list_budgets", arguments: {} }
    });
    assert.equal(response.result.isError, true);
    assert.match(response.result.content[0].text, /YNAB_ACCESS_TOKEN is not configured/);
  } finally {
    await mcp.close();
  }
});
