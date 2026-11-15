import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT) || 8765;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  const file = path.resolve(root, `.${pathname}`);
  if (file !== root && !file.startsWith(root + path.sep)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  fs.readFile(file, (error, data) => {
    if (error) {
      res.writeHead(error.code === "ENOENT" ? 404 : 500);
      res.end(error.code === "ENOENT" ? "not found" : "error");
      return;
    }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`ポート ${port} は使用中です。ほかのウィンドウのサーバーを止めてから、もう一度 npm start してください。`);
    process.exit(1);
  }
  throw error;
});

server.listen(port, "127.0.0.1", () => {
  console.log(`スワイプ成金: http://127.0.0.1:${port}`);
});
