import { spawn } from "node:child_process";

/** 调用 Python 桥接程序，并通过标准输入安全传递敏感参数。 */
export function callPythonBridge(config, command, payload, timeoutMs = 90_000) {
  return new Promise((resolve, reject) => {
    const child = spawn(config.pythonCommand, [config.pythonBridge, command], {
      cwd: process.cwd(),
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, PYTHONUTF8: "1" }
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("iCloud 操作超时"));
    }, timeoutMs);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", error => {
      clearTimeout(timer);
      reject(new Error(`无法启动 Python 桥接程序：${error.message}`));
    });
    child.on("close", code => {
      clearTimeout(timer);
      try {
        const result = JSON.parse(stdout.trim() || "{}");
        if (code !== 0 || result.ok === false) reject(new Error(result.error || "iCloud 操作失败"));
        else resolve(result);
      } catch {
        reject(new Error(stderr.trim() || "Python 桥接程序返回了无效结果"));
      }
    });
    child.stdin.end(JSON.stringify(payload));
  });
}
