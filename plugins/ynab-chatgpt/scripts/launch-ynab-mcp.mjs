#!/usr/bin/env node

import { execFileSync } from "node:child_process";

function windowsUserToken() {
  if (process.platform !== "win32") return "";

  try {
    const output = execFileSync(
      "reg.exe",
      ["query", "HKCU\\Environment", "/v", "YNAB_ACCESS_TOKEN"],
      { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "ignore"] }
    );
    const match = output.match(/YNAB_ACCESS_TOKEN\s+REG_\w+\s+([^\r\n]+)/);
    return match?.[1]?.trim() || "";
  } catch {
    return "";
  }
}

const userToken = windowsUserToken();
if (userToken) process.env.YNAB_ACCESS_TOKEN = userToken;

await import("./ynab-mcp.mjs");
