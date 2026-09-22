import { join, resolve } from "node:path";
import { packageRoot } from "./shared.mjs";

const client = process.argv[2] ?? "ide";
const configIndex = process.argv.indexOf("--config");
const configPath = configIndex >= 0 && process.argv[configIndex + 1] ? resolve(process.argv[configIndex + 1]) : join(packageRoot, "knowledge.yaml");
const server = {
  type: client === "cli" ? "local" : "stdio",
  command: process.execPath,
  args: [join(packageRoot, "scripts", "mcp.mjs"), "--config", configPath],
};

if (client === "cli") {
  process.stdout.write(`${JSON.stringify({ mcpServers: { "sistema-documentacion": { ...server, env: {}, tools: ["*"] } } }, null, 2)}\n`);
} else if (client === "ide") {
  process.stdout.write(`${JSON.stringify({ servers: { "sistema-documentacion": server } }, null, 2)}\n`);
} else {
  throw Object.assign(new Error("Cliente inválido. Use: pnpm copilot:config cli o pnpm copilot:config ide"), { exitCode: 2 });
}
