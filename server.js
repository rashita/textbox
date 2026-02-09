const http = require("http");
const fs = require("fs");
const path = require("path");
const { add } = require("./src/api/apiLogic");

const fsp = fs.promises;
const NOTES_BASE_DIR = path.join(__dirname, "local/notes");
const MAX_BODY_BYTES = 1024 * 1024;

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("Payload too large"), { code: "ETOOLARGE" }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(JSON.parse(raw));
      } catch (err) {
        err.code = "EBADJSON";
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function safeResolveNotePath(noteId) {
  const normalized = noteId.replace(/\\/g, "/");
  if (normalized.includes("\0")) {
    return null;
  }

  const baseDir = path.resolve(NOTES_BASE_DIR);
  const resolved = path.resolve(baseDir, normalized);
  if (resolved === baseDir || resolved.startsWith(baseDir + path.sep)) {
    return resolved;
  }
  return null;
}

async function listMarkdownFiles(dir, baseDir) {
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === "ENOENT") {
      return [];
    }
    throw err;
  }

  const results = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await listMarkdownFiles(fullPath, baseDir);
      results.push(...nested);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (path.extname(entry.name).toLowerCase() !== ".md") {
      continue;
    }

    const stat = await fsp.stat(fullPath);
    const relPath = path.relative(baseDir, fullPath).split(path.sep).join("/");
    const title = path.basename(entry.name, path.extname(entry.name));
    results.push({
      id: relPath,
      path: relPath,
      title,
      updatedAt: stat.mtimeMs,
    });
  }

  return results;
}

const server = http.createServer((req, res) => {
  (async () => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === "/api/add" && req.method === "GET") {
      // クエリパラメータ ?a=1&b=2 を処理
      const a = parseInt(url.searchParams.get("a") || "0", 10);
      const b = parseInt(url.searchParams.get("b") || "0", 10);
      const result = add(a, b);

      sendJson(res, 200, { result });
      return;
    }

    if ((pathname === "/api/notes" || pathname === "/api/notes/") && req.method === "GET") {
      const baseDir = path.resolve(NOTES_BASE_DIR);
      const notes = await listMarkdownFiles(baseDir, baseDir);
      notes.sort((a, b) => a.path.localeCompare(b.path));
      sendJson(res, 200, { notes });
      return;
    }

    if (pathname.startsWith("/api/notes/") && req.method === "GET") {
      const noteId = pathname.slice("/api/notes/".length);
      if (!noteId) {
        sendJson(res, 400, { error: "Missing note id." });
        return;
      }

      const resolved = safeResolveNotePath(noteId);
      if (!resolved) {
        sendJson(res, 400, { error: "Invalid note path." });
        return;
      }

      if (path.extname(resolved).toLowerCase() !== ".md") {
        sendJson(res, 400, { error: "Only .md files are allowed." });
        return;
      }

      try {
        const [content, stat] = await Promise.all([
          fsp.readFile(resolved, "utf8"),
          fsp.stat(resolved),
        ]);

        const relPath = path
          .relative(path.resolve(NOTES_BASE_DIR), resolved)
          .split(path.sep)
          .join("/");

        sendJson(res, 200, {
          id: relPath,
          path: relPath,
          content,
          updatedAt: stat.mtimeMs,
        });
        return;
      } catch (err) {
        if (err.code === "ENOENT") {
          sendJson(res, 404, { error: "Note not found." });
          return;
        }
        throw err;
      }
    }

    if ((pathname === "/api/notes" || pathname === "/api/notes/") && req.method === "POST") {
      let body;
      try {
        body = await readJsonBody(req);
      } catch (err) {
        if (err.code === "ETOOLARGE") {
          sendJson(res, 413, { error: "Payload too large." });
          return;
        }
        if (err.code === "EBADJSON") {
          sendJson(res, 400, { error: "Invalid JSON." });
          return;
        }
        throw err;
      }

      const noteId = typeof body.id === "string" ? body.id.trim() : "";
      const content = typeof body.content === "string" ? body.content : "";
      if (!noteId) {
        sendJson(res, 400, { error: "Missing note id." });
        return;
      }

      const resolved = safeResolveNotePath(noteId);
      if (!resolved) {
        sendJson(res, 400, { error: "Invalid note path." });
        return;
      }

      if (path.extname(resolved).toLowerCase() !== ".md") {
        sendJson(res, 400, { error: "Only .md files are allowed." });
        return;
      }

      await fsp.mkdir(path.dirname(resolved), { recursive: true });
      try {
        await fsp.writeFile(resolved, content, { encoding: "utf8", flag: "wx" });
      } catch (err) {
        if (err.code === "EEXIST") {
          sendJson(res, 409, { error: "Note already exists." });
          return;
        }
        throw err;
      }

      const stat = await fsp.stat(resolved);
      const relPath = path
        .relative(path.resolve(NOTES_BASE_DIR), resolved)
        .split(path.sep)
        .join("/");

      sendJson(res, 201, {
        id: relPath,
        path: relPath,
        updatedAt: stat.mtimeMs,
      });
      return;
    }

    if (pathname.startsWith("/api/notes/") && req.method === "PUT") {
      const noteId = pathname.slice("/api/notes/".length);
      if (!noteId) {
        sendJson(res, 400, { error: "Missing note id." });
        return;
      }

      let body;
      try {
        body = await readJsonBody(req);
      } catch (err) {
        if (err.code === "ETOOLARGE") {
          sendJson(res, 413, { error: "Payload too large." });
          return;
        }
        if (err.code === "EBADJSON") {
          sendJson(res, 400, { error: "Invalid JSON." });
          return;
        }
        throw err;
      }

      const content = typeof body.content === "string" ? body.content : "";
      const resolved = safeResolveNotePath(noteId);
      if (!resolved) {
        sendJson(res, 400, { error: "Invalid note path." });
        return;
      }

      if (path.extname(resolved).toLowerCase() !== ".md") {
        sendJson(res, 400, { error: "Only .md files are allowed." });
        return;
      }

      try {
        await fsp.access(resolved, fs.constants.F_OK);
      } catch (err) {
        if (err.code === "ENOENT") {
          sendJson(res, 404, { error: "Note not found." });
          return;
        }
        throw err;
      }

      await fsp.writeFile(resolved, content, "utf8");
      const stat = await fsp.stat(resolved);
      const relPath = path
        .relative(path.resolve(NOTES_BASE_DIR), resolved)
        .split(path.sep)
        .join("/");

      sendJson(res, 200, {
        id: relPath,
        path: relPath,
        updatedAt: stat.mtimeMs,
      });
      return;
    }

    // index.html を返す
    if (pathname === "/" || pathname === "/index.html") {
      const filePath = path.join(__dirname, "public/index.html");
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end("Error loading file");
        } else {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(data);
        }
      });
      return;
    }

    res.writeHead(404);
    res.end("Not Found");
  })().catch((err) => {
    console.error(err);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end("Internal Server Error");
    }
  });
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000/");
});
