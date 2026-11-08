# ChatGPT YNAB

A local Codex/ChatGPT plugin that connects to the official [YNAB API](https://api.ynab.com/). It can inspect budgets, accounts, categories, months, payees, and transactions, and create a transaction only after explicit user confirmation.

## Requirements

- Codex desktop or CLI with plugin support
- Node.js 18 or newer
- A YNAB Personal Access Token

## Install

Clone this repository, then register and install its marketplace:

```powershell
git clone https://github.com/alexmweber-JMJ/ChatGPT-YNAB.git
cd ChatGPT-YNAB
codex plugin marketplace add .
codex plugin add ynab-chatgpt@chatgpt-ynab
```

## Configure YNAB

In the YNAB web app, open **Account Settings → Developer Settings → Personal Access Tokens**, create a token, and save it as `YNAB_ACCESS_TOKEN` in the environment that launches Codex.

Windows PowerShell:

```powershell
./scripts/configure-token.ps1
```

macOS/Linux:

```bash
export YNAB_ACCESS_TOKEN='your-token'
```

After configuring the token, fully restart Codex and start a new task. Never commit or paste the token into this repository.

The bundled MCP server explicitly uses the `stdio` transport and declares `YNAB_ACCESS_TOKEN` through `env_vars`, so Codex passes the value from its launch environment without storing the secret in the plugin.

## Example prompts

- Summarize my current YNAB budget.
- Show categories that are overspent this month.
- List transactions from the last seven days.
- Prepare a $42.15 grocery transaction and ask me before creating it.

## Tools

- `ynab_list_budgets`
- `ynab_get_budget`
- `ynab_list_accounts`
- `ynab_list_categories`
- `ynab_list_months`
- `ynab_list_payees`
- `ynab_list_transactions`
- `ynab_create_transaction`

YNAB represents currency in milliunits: `1000` equals one unit of the budget currency.

## Development

```powershell
npm test
```

The MCP server uses only Node.js built-ins and the global `fetch` API; there are no runtime dependencies.

## Security

- The access token is read from `YNAB_ACCESS_TOKEN` and sent only to `https://api.ynab.com/v1`.
- The plugin never logs the token.
- Read operations do not require confirmation.
- Transaction creation requires explicit user confirmation under the bundled skill instructions.

## License

MIT
