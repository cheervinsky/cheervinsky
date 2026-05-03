// Tiny local dev server for the Cheervinsky site.
//
// Why this exists:
//   When you open index.html via file:// you can't auto-save edits to disk —
//   browsers can only download files. Running this server gives the admin UI a
//   /api/save endpoint that writes data/posts.json directly into the project
//   folder, so your editing loop becomes:
//
//       1. node serve.js
//       2. open http://localhost:8765/#admin
//       3. edit posts in the admin UI, click Save
//          (the bundle detects the local server and writes data/posts.json
//           and any uploaded images to disk automatically)
//       4. git add data/ && git commit -m "..." && git push
//
//   No PAT needed in the browser, no clicking "Publish to production".
//
// Usage:
//   node serve.js                # serves on http://localhost:8765
//   PORT=3000 node serve.js      # custom port
//
// Has zero npm dependencies on purpose — only Node's built-in http/fs.

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const MEDIA_DIR = path.join(DATA_DIR, 'media');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const PORT = parseInt(process.env.PORT, 10) || 8765;

// Make sure data/ and data/media/ exist.
fs.mkdirSync(MEDIA_DIR, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.ico':  'image/x-icon',
  '.txt':  'text/plain; charset=utf-8',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Cache-Control': 'no-store', ...headers });
  res.end(body);
}

function readBody(req, max = 25 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let data = [], size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > max) { reject(new Error('payload too large')); req.destroy(); return; }
      data.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(data)));
    req.on('error', reject);
  });
}

function safeFilename(name) {
  return String(name || 'asset')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(-128) || 'asset';
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = decodeURIComponent(parsed.pathname || '/');

  // ---- API ----
  if (pathname === '/api/status' && req.method === 'GET') {
    return send(res, 200, JSON.stringify({ ok: true, version: 1 }), { 'Content-Type': MIME['.json'] });
  }

  if (pathname === '/api/save' && req.method === 'POST') {
    try {
      const buf = await readBody(req);
      const json = JSON.parse(buf.toString('utf8'));
      if (!json || typeof json !== 'object' || !Array.isArray(json.posts)) {
        return send(res, 400, JSON.stringify({ ok: false, message: 'Bad payload — expected { posts: [...] }' }), { 'Content-Type': MIME['.json'] });
      }
      fs.writeFileSync(POSTS_FILE, JSON.stringify(json, null, 2) + '\n', 'utf8');
      console.log('[serve] wrote', POSTS_FILE, '(' + json.posts.length + ' posts)');
      return send(res, 200, JSON.stringify({ ok: true, message: 'Saved to data/posts.json' }), { 'Content-Type': MIME['.json'] });
    } catch (e) {
      return send(res, 500, JSON.stringify({ ok: false, message: 'Save failed: ' + (e && e.message || e) }), { 'Content-Type': MIME['.json'] });
    }
  }

  if (pathname === '/api/upload' && req.method === 'POST') {
    try {
      const buf = await readBody(req);
      const json = JSON.parse(buf.toString('utf8'));
      if (!json || !json.base64 || !json.filename) {
        return send(res, 400, JSON.stringify({ ok: false, message: 'Bad payload — expected { filename, base64 }' }), { 'Content-Type': MIME['.json'] });
      }
      const filename = safeFilename(json.filename);
      const dest = path.join(MEDIA_DIR, filename);
      fs.writeFileSync(dest, Buffer.from(json.base64, 'base64'));
      console.log('[serve] wrote', dest, '(' + fs.statSync(dest).size + ' bytes)');
      return send(res, 200, JSON.stringify({ ok: true, ref: 'data/media/' + filename }), { 'Content-Type': MIME['.json'] });
    } catch (e) {
      return send(res, 500, JSON.stringify({ ok: false, message: 'Upload failed: ' + (e && e.message || e) }), { 'Content-Type': MIME['.json'] });
    }
  }

  // ---- Static files ----
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method Not Allowed');
  }

  // Map "/" to "/index.html"
  let rel = pathname === '/' ? '/index.html' : pathname;
  // Strip any hash/query already removed by url.parse.
  // Resolve safely inside ROOT.
  const target = path.normalize(path.join(ROOT, rel));
  if (!target.startsWith(ROOT)) return send(res, 403, 'Forbidden');

  fs.stat(target, (err, stat) => {
    if (err || !stat.isFile()) return send(res, 404, 'Not found: ' + rel);
    const ext = path.extname(target).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(target).pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  Cheervinsky dev server running.');
  console.log('  Open:   http://localhost:' + PORT + '/');
  console.log('  Admin:  http://localhost:' + PORT + '/#admin');
  console.log('  (Save writes data/posts.json and data/media/ — then `git push` to publish.)');
  console.log('');
});
