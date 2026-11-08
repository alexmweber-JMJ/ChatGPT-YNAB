#!/usr/bin/env node

import readline from "node:readline";

const API_ROOT = "https://api.ynab.com/v1";
const SERVER_VERSION = "1.0.1";

function string(description) {
  return { type: "string", ...(description ? { description } : {}) };
}

function object(required, properties) {
  return { type: "object", required, properties, additionalProperties: false };
}

const definitions = {
  ynab_list_budgets: ["List the YNAB budgets available to the authenticated user.", object([], {})],
  ynab_get_budget: ["Get a complete YNAB budget snapshot.", object(["budget_id"], {
    budget_id: string("Budget UUID or 'last-used'.")
  })],
  ynab_list_accounts: ["List accounts and balances in a budget.", object(["budget_id"], {
    budget_id: string("Budget UUID or 'last-used'.")
  })],
  ynab_list_categories: ["List category groups and category balances.", object(["budget_id"], {
    budget_id: string("Budget UUID or 'last-used'."),
    month: string("Optional month in YYYY-MM-DD format.")
  })],
  ynab_list_months: ["List budget months and their totals.", object(["budget_id"], {
    budget_id: string("Budget UUID or 'last-used'.")
  })],
  ynab_list_payees: ["List payees in a budget.", object(["budget_id"], {
    budget_id: string("Budget UUID or 'last-used'.")
  })],
  ynab_list_transactions: ["List or incrementally retrieve transactions.", object(["budget_id"], {
    budget_id: string("Budget UUID or 'last-used'."),
    since_date: string("Optional earliest transaction date in YYYY-MM-DD format."),
    type: { type: "string", enum: ["uncategorized", "unapproved"] },
    last_knowledge_of_server: { type: "integer", minimum: 0 }
  })],
  ynab_create_transaction: ["Create one transaction after explicit user confirmation.", object(["budget_id", "account_id", "date", "amount"], {
    budget_id: string("Budget UUID or 'last-used'."),
    account_id: string("Account UUID."),
    date: string("Transaction date in YYYY-MM-DD format."),
    amount: { type: "integer", description: "Signed milliunits: negative is an outflow and positive is an inflow." },
    payee_id: string("Existing payee UUID."),
    payee_name: string("New or existing payee name. Do not combine with payee_id."),
    category_id: string("Category UUID."),
    memo: string("Optional transaction memo."),
    cleared: { type: "string", enum: ["cleared", "uncleared", "reconciled"] },
    approved: { type: "boolean" },
    import_id: string("Optional stable import identifier for de-duplication.")
  })]
};

const tools = Object.entries(definitions).map(([name, [description, inputSchema]]) => ({
  name,
  description,
  inputSchema
}));

function accessToken() {
  const token = process.env.YNAB_ACCESS_TOKEN?.trim();
  if (!token || token === "${YNAB_ACCESS_TOKEN}") {
    throw new Error("YNAB_ACCESS_TOKEN is not configured in the environment that launched Codex.");
  }
  return token;
}

async function ynab(path, options = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = body?.error?.detail || body?.error?.name || response.statusText;
    throw new Error(`YNAB API ${response.status}: ${detail}`);
  }
  return body.data;
}

function query(values) {
  const params = new URLSearchParams(
    Object.entries(values)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)])
  );
  return params.size ? `?${params}` : "";
}

async function invoke(name, args) {
  const budget = encodeURIComponent(args.budget_id || "");

  if (name === "ynab_list_budgets") return ynab("/budgets");
  if (name === "ynab_get_budget") return ynab(`/budgets/${budget}`);
  if (name === "ynab_list_accounts") return ynab(`/budgets/${budget}/accounts`);
  if (name === "ynab_list_categories") {
    const suffix = args.month
      ? `/months/${encodeURIComponent(args.month)}/categories`
      : "/categories";
    return ynab(`/budgets/${budget}${suffix}`);
  }
  if (name === "ynab_list_months") return ynab(`/budgets/${budget}/months`);
  if (name === "ynab_list_payees") return ynab(`/budgets/${budget}/payees`);
  if (name === "ynab_list_transactions") {
    return ynab(`/budgets/${budget}/transactions${query({
      since_date: args.since_date,
      type: args.type,
      last_knowledge_of_server: args.last_knowledge_of_server
    })}`);
  }
  if (name === "ynab_create_transaction") {
    if (args.payee_id && args.payee_name) {
      throw new Error("Use either payee_id or payee_name, not both.");
    }
    const transaction = Object.fromEntries(
      Object.entries(args).filter(([key, value]) => key !== "budget_id" && value !== undefined)
    );
    return ynab(`/budgets/${budget}/transactions`, {
      method: "POST",
      body: JSON.stringify({ transaction })
    });
  }
  throw new Error(`Unknown tool: ${name}`);
}

function write(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on("line", async (line) => {
  let request;
  try {
    request = JSON.parse(line);
    if (request.method === "notifications/initialized") return;

    let result;
    if (request.method === "initialize") {
      result = {
        protocolVersion: request.params?.protocolVersion || "2025-03-26",
        capabilities: { tools: {} },
        serverInfo: { name: "ynab-chatgpt", version: SERVER_VERSION }
      };
    } else if (request.method === "tools/list") {
      result = { tools };
    } else if (request.method === "tools/call") {
      try {
        const data = await invoke(request.params.name, request.params.arguments || {});
        result = { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        result = { isError: true, content: [{ type: "text", text: error.message }] };
      }
    } else {
      throw new Error(`Unsupported method: ${request.method}`);
    }

    write({ jsonrpc: "2.0", id: request.id, result });
  } catch (error) {
    write({
      jsonrpc: "2.0",
      id: request?.id ?? null,
      error: { code: -32603, message: error.message }
    });
  }
});
