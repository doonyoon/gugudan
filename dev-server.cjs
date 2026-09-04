const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT || process.env.GAME_DEV_PORT || 8000);
const canonicalUrl = 'https://doonyoon.github.io/gugudan/';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png'
};

http.createServer((request, response) => {
  const pathname = decodeURIComponent(request.url.split('?')[0]);
  if (pathname === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ status: 'ok', game: '고양이 성채전' }));
    return;
  }
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
    const host = /^[a-z0-9.-]+(?::\d+)?$/i.test(request.headers.host || '') ? request.headers.host : '';
    if (host && ['.html', '.xml', '.txt'].includes(path.extname(file))) {
      const forwardedProto = String(request.headers['x-forwarded-proto'] || '').split(',')[0];
      const protocol = forwardedProto === 'https' || forwardedProto === 'http' ? forwardedProto : 'http';
      const publicUrl = `${protocol}://${host}/`;
      data = Buffer.from(data.toString('utf8').replaceAll(canonicalUrl, publicUrl));
    }
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('Cache-Control', process.env.NODE_ENV === 'production' ? 'public, max-age=300' : 'no-store');
    response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    response.end(data);
  });
}).listen(port, '0.0.0.0', () => {
  console.log(`Game server: http://localhost:${port}`);
});
