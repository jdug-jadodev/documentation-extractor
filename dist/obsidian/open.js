import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
export async function openObsidian(vaultPath, file = "Inicio.md") {
    const vaultUrl = pathToFileURL(vaultPath).href;
    const uri = `obsidian://open?vault=${encodeURIComponent(vaultUrl)}&file=${encodeURIComponent(file)}`;
    const command = process.platform === "win32" ? { executable: "explorer.exe", args: [uri] } : process.platform === "darwin" ? { executable: "/usr/bin/open", args: [uri] } : { executable: "/usr/bin/xdg-open", args: [uri] };
    try {
        await new Promise((resolve, reject) => { const child = spawn(command.executable, command.args, { shell: false, windowsHide: true, stdio: "ignore" }); child.once("error", reject); child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`Código ${code}`))); });
        return { opened: true, manual: "" };
    }
    catch {
        return { opened: false, manual: `Abra Obsidian, elija “Abrir carpeta como boveda” y seleccione: ${vaultPath}` };
    }
}
//# sourceMappingURL=open.js.map