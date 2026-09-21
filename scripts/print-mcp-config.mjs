import { join } from "node:path";
import { packageRoot } from "./shared.mjs";

const client = process.argv[2] ?? "ide";
const server = {
  type: client === "cli" ? "local" : "stdio",
  command: process.execPath,
  args: [join(packageRoot, "scripts", "mcp.mjs"), "--config", join(packageRoot, "knowledge.yaml")],
};

if (client === "cli") {
  process.stdout.write(`${JSON.stringify({ mcpServers: { "sistema-documentacion": { ...server, env: {}, tools: ["*"] } } }, null, 2)}\n`);
} else if (client === "ide") {
  process.stdout.write(`${JSON.stringify({ servers: { "sistema-documentacion": server } }, null, 2)}\n`);
} else {
  throw Object.assign(new Error("Cliente inválido. Use: pnpm copilot:config cli o pnpm copilot:config ide"), { exitCode: 2 });
}
