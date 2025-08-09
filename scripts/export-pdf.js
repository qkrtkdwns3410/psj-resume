/*
  Export resume.html and portfolio.html to PDFs using Puppeteer.
  - Starts a static server on http://127.0.0.1:8080
  - Waits for Mermaid to render
  - Prints with background graphics, A4, using CSS @page
*/

const http = require('http');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

function startStaticServer(rootDir, port = 8080) {
  const server = http.createServer((req, res) => {
    const safeSuffix = path.normalize(req.url).replace(/^\/+/, '');
    let filePath = path.join(rootDir, safeSuffix || 'index.html');

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
  await page.waitForFunction(() => {
    const diagrams = Array.from(document.querySelectorAll('.mermaid'));
    if (diagrams.length === 0) return true;
    return diagrams.every((d) => d.querySelector('svg'));
  }, { timeout: 15000, polling: 200 });
  
  // 추가 안정화 시간 (렌더링 완료 보장)
  await page.waitForTimeout(1000);
}

async function ensureFonts(page) {
  // Inject Noto Sans KR preload to improve reliability in headless Chromium
  await page.addStyleTag({
    content: "@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap');"
  });
}

async function exportPage(browser, url, outPath) {
  const page = await browser.newPage();
  
  // 성능 최적화: 불필요한 리소스 차단
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.resourceType() === 'image' && !req.url().includes('favicon')) {
      req.abort();
    } else {
      req.continue();
    }
  });

  // 뷰포트 설정으로 렌더링 최적화
  await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 1 });
  
  await page.goto(url, { waitUntil: ['load', 'domcontentloaded'] });
  await ensureFonts(page);
  await waitForMermaid(page);

  await page.emulateMediaType('screen');

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
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
    ],
    headless: 'new',
  });

  try {
    const targets = [
      { url: `${baseUrl}/resume.html`, out: path.join(distDir, 'resume.pdf') },
      { url: `${baseUrl}/portfolio.html`, out: path.join(distDir, 'portfolio.pdf') },
    ];

    // 병렬 처리로 PDF 생성 최적화
    await Promise.all(
      targets.map(async (t) => {
        console.log(`Exporting ${t.url} -> ${t.out}`);
        await exportPage(browser, t.url, t.out);
      })
    );

    console.log('PDF export complete. Files saved to ./dist');
  } catch (e) {
    console.error('PDF export failed:', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
})();
