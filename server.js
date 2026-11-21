import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import waitlistHandler from './api/waitlist.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Automatically load .env or .env.local file if present
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      try {
        if (process.loadEnvFile) {
          process.loadEnvFile(fullPath);
        } else {
          const content = fs.readFileSync(fullPath, 'utf8');
          content.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const match = trimmed.match(/^([^=]+)=(.*)$/);
            if (match) {
              const key = match[1].trim();
              let val = match[2].trim();
              if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
              }
              process.env[key] = val;
            }
          });
        }
        console.log(`Loaded environment variables from ${file}`);
        break;
      } catch (err) {
        console.warn(`Could not load ${file}:`, err.message);
      }
    }
  }
}

loadEnv();

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = parsedUrl.pathname;

  // 2. Handle /api/waitlist serverless endpoint locally
  if (pathname === '/api/waitlist') {
    let bodyData = '';
    req.on('data', chunk => { bodyData += chunk; });
    req.on('end', async () => {
      try {
        req.body = bodyData ? JSON.parse(bodyData) : {};
      } catch (e) {
        req.body = {};
      }

      // Shim res.status().json() like Vercel serverless
      res.status = function (code) {
        this.statusCode = code;
        return this;
      };
      res.json = function (obj) {
        this.setHeader('Content-Type', 'application/json');
        this.end(JSON.stringify(obj));
        return this;
      };

      try {
        await waitlistHandler(req, res);
      } catch (err) {
        console.error('API Error:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 3. Static File Server
  if (pathname === '/') pathname = '/index.html';
  let filePath = path.join(__dirname, decodeURIComponent(pathname));

  // Support clean URLs without .html extension
  if (!path.extname(filePath) && fs.existsSync(filePath + '.html')) {
    filePath += '.html';
  }

  // Security: prevent path traversal outside workspace
  if (!filePath.startsWith(__dirname)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html');
      res.end('<h1>404 Not Found</h1>');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`  Begin Landing Page running locally at:`);
  console.log(`  > Local: http://localhost:${PORT}`);
  if (process.env.SUPABASE_URL) {
    console.log(`  > Supabase: Connected to ${process.env.SUPABASE_URL}`);
  } else {
    console.log(`  > Supabase: No SUPABASE_URL detected in .env yet`);
  }
  console.log(`=================================================\n`);
});
