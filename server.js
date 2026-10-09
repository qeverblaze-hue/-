import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const publicFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/game.js', ['game.js', 'text/javascript; charset=utf-8']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']],
]);

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  let path;
  try {
    path = new URL(request.url, 'http://localhost').pathname;
  } catch {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Bad request');
    return;
  }
  const resource = publicFiles.get(path);
  if (!resource) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }
  try {
    const body = await readFile(new URL(resource[0], import.meta.url));
    response.writeHead(200, {
      'Content-Type': resource[1],
      'Content-Length': body.length,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    console.error('Unable to serve file:', error.message);
    response.writeHead(500).end('Unable to serve file');
  }
});
server.on('error', (error) => {
  console.error(`Cannot start game server: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, host, () => console.log(`Snake game is running on port ${port}.`));
