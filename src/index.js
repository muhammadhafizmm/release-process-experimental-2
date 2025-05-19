const http = require("http");
const url = require("url");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  const { pathname } = url.parse(req.url, true);

  res.writeHead(200, { "Content-Type": "application/json" });

  if (pathname === "/ping") {
    res.end(JSON.stringify({ message: "pong" }));
  } else {
    res.end(JSON.stringify({ message: "Hello from Node.js!" }));
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
