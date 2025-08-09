/*
  Export resume.html, portfolio.html, resume-sticky.html, and portfolio-sticky.html to PDFs using Puppeteer.
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
  // await page.waitForTimeout(1000);
}

async function ensureFonts(page) {
  // Inject Noto Sans KR preload to improve reliability in headless Chromium
  await page.addStyleTag({
    content: `
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap');
      
      /* Mermaid 다이어그램 한글 폰트 설정 */
      .mermaid * {
        font-family: 'Noto Sans KR', sans-serif !important;
      }
      
      .mermaid text {
        font-family: 'Noto Sans KR', sans-serif !important;
      }
      
      .mermaid svg text {
        font-family: 'Noto Sans KR', sans-serif !important;
      }
    `
  });
  
  // 폰트 로딩 완료 대기
  await page.evaluate(() => {
    return document.fonts.ready;
  });
}

async function exportPage(browser, url, outPath) {
  const page = await browser.newPage();

  // 성능 최적화: 불필요한 리소스 차단 (프로필 이미지는 허용)
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.resourceType() === 'image' && 
        !req.url().includes('favicon') && 
        !req.url().includes('JK_GG_EKNc.jpg') && 
        !req.url().includes('/img/')) {
      req.abort();
    } else {
      req.continue();
    }
  });

  // 뷰포트 설정으로 렌더링 최적화
  await page.setViewport({ width: 1200, height: 2400, deviceScaleFactor: 0.8 });

  await page.goto(url, { waitUntil: ['load', 'domcontentloaded'] });
  await ensureFonts(page);
  await waitForMermaid(page);
  
  // 사이드바 콘텐츠 강제 표시
  await page.evaluate(() => {
    const sidebar = document.querySelector('.sidebar');
    const profileCard = document.querySelector('.profile-card');
    const skillsOverview = document.querySelector('.skills-overview');
    const certifications = document.querySelector('.certifications-sidebar');
    
    if (sidebar) {
      sidebar.style.height = 'auto';
      sidebar.style.maxHeight = 'none';
      sidebar.style.overflow = 'visible';
      sidebar.style.position = 'static';
      sidebar.style.display = 'block';
    }
    
    if (profileCard) {
      profileCard.style.height = 'auto';
      profileCard.style.maxHeight = 'none';
      profileCard.style.overflow = 'visible';
      profileCard.style.display = 'block';
    }
    
    if (skillsOverview) {
      skillsOverview.style.height = 'auto';
      skillsOverview.style.maxHeight = 'none';
      skillsOverview.style.overflow = 'visible';
      skillsOverview.style.display = 'block';
    }
    
    if (certifications) {
      certifications.style.height = 'auto';
      certifications.style.maxHeight = 'none';
      certifications.style.overflow = 'visible';
      certifications.style.display = 'block';
    }
    
    // 모든 스킬 아이템들 강제 표시
    const skillItems = document.querySelectorAll('.skill-item');
    skillItems.forEach(item => {
      item.style.display = 'flex';
      item.style.visibility = 'visible';
    });
    
    // 모든 자격증 아이템들 강제 표시
    const certItems = document.querySelectorAll('.cert-item');
    certItems.forEach(item => {
      item.style.display = 'flex';
      item.style.visibility = 'visible';
    });
    
    // 스킬바들 강제 표시
    const skillLevels = document.querySelectorAll('.skill-level');
    skillLevels.forEach(level => {
      level.style.display = 'block';
      level.style.visibility = 'visible';
      level.style.width = '100%';
      level.style.height = '8px';
      level.style.backgroundColor = '#e2e8f0';
      level.style.borderRadius = '4px';
      level.style.position = 'relative';
      level.style.marginTop = '8px';
    });
    
    const skillBars = document.querySelectorAll('.skill-bar');
    skillBars.forEach(bar => {
      bar.style.display = 'block';
      bar.style.visibility = 'visible';
      bar.style.height = '8px';
      bar.style.backgroundColor = '#667eea';
      bar.style.borderRadius = '4px';
      bar.style.position = 'absolute';
      bar.style.top = '0';
      bar.style.left = '0';
    });
    
    // skill-item-detailed들 강제 표시
    const skillItemsDetailed = document.querySelectorAll('.skill-item-detailed');
    skillItemsDetailed.forEach(item => {
      item.style.display = 'block';
      item.style.visibility = 'visible';
      item.style.marginBottom = '15px';
    });
    
    // 일반 시퀀스 다이어그램 폰트 크기 조정
    const allMermaidTexts = document.querySelectorAll('.mermaid text, .mermaid .actor text, .mermaid .messageLine text, .mermaid .messageText, .mermaid .noteText');
    allMermaidTexts.forEach(text => {
      text.style.fontSize = '18px';
      text.style.fontWeight = '600';
      text.style.fontFamily = "'Noto Sans KR', sans-serif";
    });
    
    // 특정 다이어그램만 더 큰 폰트 적용
    const largeMermaidTexts = document.querySelectorAll('.mermaid-large-text .mermaid text, .mermaid-large-text .mermaid .actor text, .mermaid-large-text .mermaid .messageLine text, .mermaid-large-text .mermaid .messageText, .mermaid-large-text .mermaid .noteText');
    largeMermaidTexts.forEach(text => {
      text.style.fontSize = '22px';
      text.style.fontWeight = '700';
      text.style.fontFamily = "'Noto Sans KR', sans-serif";
    });
    
    // 일반 Mermaid SVG 요소들의 폰트 크기 설정
    const mermaidSvgs = document.querySelectorAll('.mermaid svg');
    mermaidSvgs.forEach(svg => {
      if (!svg.closest('.mermaid-large-text')) {
        svg.style.fontSize = '18px';
        const allTexts = svg.querySelectorAll('text');
        allTexts.forEach(text => {
          text.style.fontSize = '18px';
          text.style.fontWeight = '600';
          text.style.fontFamily = "'Noto Sans KR', sans-serif";
          text.setAttribute('font-size', '18');
          text.setAttribute('font-weight', '600');
          text.setAttribute('font-family', "'Noto Sans KR', sans-serif");
        });
      }
    });
    
    // 특정 다이어그램 SVG 요소들의 더 큰 폰트 크기 설정
    const largeMermaidSvgs = document.querySelectorAll('.mermaid-large-text .mermaid svg');
    largeMermaidSvgs.forEach(svg => {
      svg.style.fontSize = '22px';
      const allTexts = svg.querySelectorAll('text');
      allTexts.forEach(text => {
        text.style.fontSize = '22px';
        text.style.fontWeight = '700';
        text.style.fontFamily = "'Noto Sans KR', sans-serif";
        text.setAttribute('font-size', '22');
        text.setAttribute('font-weight', '700');
        text.setAttribute('font-family', "'Noto Sans KR', sans-serif");
      });
    });
  });
  
  // Mermaid 다이어그램 폰트 강제 적용
  await page.evaluate(() => {
    // 모든 Mermaid 요소에 한글 폰트 강제 적용
    const allMermaidElements = document.querySelectorAll('.mermaid, .mermaid *, .mermaid text, .mermaid svg text');
    allMermaidElements.forEach(element => {
      element.style.fontFamily = "'Noto Sans KR', sans-serif";
      if (element.tagName === 'text') {
        element.setAttribute('font-family', "'Noto Sans KR', sans-serif");
      }
    });
  });

  // 콘텐츠 렌더링 완료 대기
  await new Promise(resolve => setTimeout(resolve, 3000));

  await page.emulateMediaType('screen');

  await page.pdf({
    path: outPath,
    printBackground: true,
    preferCSSPageSize: false,
    width: '210mm',
    height: '500mm',  // 매우 긴 페이지로 설정
    margin: { top: '15mm', right: '12mm', bottom: '15mm', left: '12mm' },
    displayHeaderFooter: false,
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
      { url: `${baseUrl}/resume-horizontal.html`, out: path.join(distDir, 'resume-horizontal.pdf') },
      { url: `${baseUrl}/portfolio-horizontal.html`, out: path.join(distDir, 'portfolio-horizontal.pdf') },
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
