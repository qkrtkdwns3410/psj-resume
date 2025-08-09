/*
  Export resume.html and portfolio.html to PDFs using Puppeteer.
  - Starts a static server on http://127.0.0.1:8080
  - Waits for Mermaid to render
  - Prints with background graphics, A4, using CSS @page
*/

const http = require('http');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const puppeteer = require('puppeteer');

// Simple static server (no external deps) serving current repo root
function startStaticServer(rootDir, port = 8080) {
  const server = http.createServer((req, res) => {
    const safeSuffix = path.normalize(req.url).replace(/^\/+/, '');
    let filePath = path.join(rootDir, safeSuffix || 'index.html');

    // If path is a directory, try index.html
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const mime = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.ico': 'image/x-icon',
        '.webmanifest': 'application/manifest+json; charset=utf-8',
        '.pdf': 'application/pdf',
      }[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      res.end(data);
    });
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

async function waitForMermaid(page) {
  // Wait until all .mermaid containers have rendered an <svg>
  await page.waitForFunction(() => {
    const diagrams = Array.from(document.querySelectorAll('.mermaid'));
    if (diagrams.length === 0) return true; // no diagrams, continue
    return diagrams.every((d) => d.querySelector('svg'));
  }, { timeout: 30000 });
}

async function exportPage(browser, url, outPath) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: ['load', 'networkidle2'] });
  await waitForMermaid(page);

  // Ensure fonts and CSS applied
  await page.emulateMediaType('screen');

  // Use page.pdf with background and CSS page size
  await page.pdf({
    path: outPath,
    printBackground: true,
    preferCSSPageSize: true,
    format: 'A4',
    landscape: false,
    margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
  });

  await page.close();
}

(async () => {
  const rootDir = process.cwd();
  const server = await startStaticServer(rootDir, 8080);
  const baseUrl = 'http://127.0.0.1:8080';

  const distDir = path.join(rootDir, 'dist');
  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: 'new',
  });

  try {
    const targets = [
      { url: `${baseUrl}/resume.html`, out: path.join(distDir, 'resume.pdf') },
      { url: `${baseUrl}/portfolio.html`, out: path.join(distDir, 'portfolio.pdf') },
    ];

    for (const t of targets) {
      console.log(`Exporting ${t.url} -> ${t.out}`);
      await exportPage(browser, t.url, t.out);
    }

    console.log('PDF export complete. Files saved to ./dist');
  } catch (e) {
    console.error('PDF export failed:', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
})();
