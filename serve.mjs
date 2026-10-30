// Static server. The landing page is the site root. The city lives at /city/.
// .gz city data is served as a file, not Content-Encoding: gzip. The city
// scripts inflate the bytes themselves when the gzip magic is still there.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), 'web');
const port = Number(process.env.PORT) || 4173;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gz': 'application/gzip',
  '.bin': 'application/octet-stream',
  '.woff2': 'font/woff2'
};

function resolvePath(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  if (clean === '/' || clean === '/index.html') return path.join(webRoot, 'landing', 'index.html');
  const full = path.normalize(path.join(webRoot, clean.replace(/^\/+/, '')));
  if (full !== webRoot && !full.startsWith(webRoot + path.sep)) return null;
  return full;
}

const server = http.createServer((req, res) => {
  const target = resolvePath(req.url || '/');
  if (!target) {
    res.writeHead(400);
    res.end('Bad path');
    return;
  }
  fs.stat(target, (error, stat) => {
    const file = !error && stat.isDirectory() ? path.join(target, 'index.html') : target;
    fs.readFile(file, (readError, data) => {
      if (readError) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const type = types[path.extname(file).toLowerCase()] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  });
});

server.listen(port, () => {
  console.log(`Grand Depth Auto http://127.0.0.1:${port}`);
});
