const http = require("http");
const fs = require("fs");
const path = require("path");
const { add } = require("./src/api/apiLogic");

const server = http.createServer((req, res) => {
  if (req.url === "/api/add" && req.method === "GET") {
    // クエリパラメータ ?a=1&b=2 を処理
    const url = new URL(req.url, `http://${req.headers.host}`);
    const a = parseInt(url.searchParams.get("a") || "0", 10);
    const b = parseInt(url.searchParams.get("b") || "0", 10);
    const result = add(a, b);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ result }));
    return;
  }

  // index.html を返す
  if (req.url === "/" || req.url === "/index.html") {
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
});

server.listen(3000, () => {
  console.log("Server running at http://localhost:3000/");
});