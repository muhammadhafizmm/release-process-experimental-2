const http = require('http');

const PORT = process.env.PORT || 3001;

const server = http.createServer((_, res) => {
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({ message: 'Hello from Node.js!' }));
});

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
