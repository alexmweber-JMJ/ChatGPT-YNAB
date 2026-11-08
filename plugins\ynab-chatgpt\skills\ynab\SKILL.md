---
name: ynab
description: Use YNAB data to answer questions about budgets, accounts, categories, months, payees, and transactions, or create a transaction after explicit confirmation.
---

# YNAB

Use the `ynab` MCP tools for the user's YNAB data.

- Start with `ynab_list_budgets` when no budget ID is known.
- Treat all YNAB amounts as milliunits: 1000 equals one currency unit.
- Never expose the access token in responses, logs, or tool arguments.
- Read operations do not need confirmation.
- Before `ynab_create_transaction`, summarize the account, date, payee, category, memo, signed amount, cleared state, and approval state, then obtain explicit user confirmation.
- Never infer an ambiguous account, category, date, or amount sign for a write.
- Explain that an imported transaction may later match a manually entered transaction.
