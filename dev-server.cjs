const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.env.GAME_DEV_PORT || 8000);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

http.createServer((request, response) => {
  const pathname = decodeURIComponent(request.url.split('?')[0]);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(root, relative);

  if (!file.startsWith(root + path.sep)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(file, (error, data) => {
    if (error) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    response.end(data);
  });
}).listen(port, '127.0.0.1', () => {
  console.log(`Game server: http://localhost:${port}`);
});
