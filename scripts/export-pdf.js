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
  // 먼저 시스템 폰트 목록 확인
  await page.evaluate(() => {
    console.log('Available fonts:', document.fonts.ready);
  });

  // 로컬 폰트 파일들을 직접 로드
  await page.addStyleTag({
    content: `
      /* 한글 폰트 강제 로드 */
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap');
      @import url('https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap');
      @import url('https://fonts.googleapis.com/css2?family=Nanum+Gothic+Coding:wght@400;700&display=swap');

      /* Global Korean font fallback */
      * {
        font-family: 'Noto Sans KR', 'Nanum Gothic', 'Nanum Gothic Coding', 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif !important;
      }

      /* Mermaid 다이어그램 한글 폰트 설정 - 더 강력한 적용 */
      .mermaid, .mermaid *, .mermaid text, .mermaid svg, .mermaid svg text,
      .mermaid tspan, .mermaid .actor, .mermaid .messageText, .mermaid .noteText {
        font-family: 'Noto Sans KR', 'Nanum Gothic', 'Nanum Gothic Coding', 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif !important;
      }

      /* 더 구체적인 머메이드 선택자들 */
      g[class*="actor"] text,
      g[class*="message"] text,
      g[class*="note"] text,
      .flowchart text,
      .sequence text {
        font-family: 'Noto Sans KR', 'Nanum Gothic', 'Nanum Gothic Coding', 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif !important;
      }

      /* SVG 텍스트 요소 강제 폰트 적용 */
      svg text, svg tspan {
        font-family: 'Noto Sans KR', 'Nanum Gothic', 'Nanum Gothic Coding', 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif !important;
      }
    `
  });

  // 폰트 로딩 완료 대기 - 더 오래 기다림
  await page.evaluate(() => {
    return document.fonts.ready;
  });

  // 추가 폰트 로딩 대기
  await new Promise(resolve => setTimeout(resolve, 3000));
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

  // intro-cards.html 특별 처리
  if (url.includes('intro-cards.html')) {
    await page.evaluate(() => {
      // PDF 생성 시 숨길 요소들 처리
      const pdfHiddenElements = document.querySelectorAll('.pdf-hidden');
      pdfHiddenElements.forEach(el => {
        el.style.display = 'none';
      });

      // 네비게이션 바 숨기기
      const navBar = document.querySelector('.navigation-bar');
      if (navBar) {
        navBar.style.display = 'none';
      }

      // PDF 다운로드 버튼 숨기기
      const pdfDownload = document.querySelector('.pdf-download');
      if (pdfDownload) {
        pdfDownload.style.display = 'none';
      }

      // 카드 섹션 레이아웃 강제 수정
      const cardsSection = document.querySelector('.cards-section');
      if (cardsSection) {
        cardsSection.style.height = 'auto';
        cardsSection.style.overflow = 'visible';
        cardsSection.style.minHeight = 'auto';
      }

      const cardsContainerWrapper = document.querySelector('.cards-container-wrapper');
      if (cardsContainerWrapper) {
        cardsContainerWrapper.style.minHeight = 'auto';
        cardsContainerWrapper.style.height = 'auto';
      }

      const cardsContainer = document.querySelector('.cards-container');
      if (cardsContainer) {
        cardsContainer.style.maxHeight = 'none';
        cardsContainer.style.opacity = '1';
        cardsContainer.style.transform = 'none';
        cardsContainer.style.overflow = 'visible';
      }

      // 카드 행 레이아웃 강제 수정
      const cardsRows = document.querySelectorAll('.cards-row');
      cardsRows.forEach(row => {
        row.style.height = 'auto';
        row.style.minHeight = 'auto';
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '1fr 1fr';
        row.style.gap = '10mm';
        row.style.marginBottom = '10mm';
        row.style.alignItems = 'start';
      });

             // 카드 레이아웃 최적화 - 높이 통일
       const cards = document.querySelectorAll('.card');
       cards.forEach(card => {
         card.style.pageBreakInside = 'avoid';
         card.style.breakInside = 'avoid';
         card.style.height = '200mm'; // 높이를 더 크게 설정
         card.style.minHeight = '200mm'; // 최소 높이도 동일하게
         card.style.maxHeight = '200mm'; // 최대 높이도 제한
         card.style.display = 'block';
         card.style.boxShadow = 'none';
         card.style.border = '1px solid #ddd';
         card.style.padding = '8mm';
         card.style.margin = '0';
         card.style.fontSize = '0.9rem';
         card.style.overflow = 'visible'; // 내용이 잘리지 않도록
       });

             // 카드 콘텐츠 강제 표시 - 높이 조정
       const cardContents = document.querySelectorAll('.card-content');
       cardContents.forEach(content => {
         content.style.maxHeight = 'none';
         content.style.opacity = '1';
         content.style.margin = '0';
         content.style.padding = '0';
         content.style.overflow = 'visible';
         content.style.height = 'calc(200mm - 20mm)'; // 카드 높이에서 헤더 높이와 패딩 제외
         content.style.display = 'flex';
         content.style.flexDirection = 'column';
       });

      // 접힌 카드들 강제 펼치기
      const collapsedCards = document.querySelectorAll('.card.collapsed');
      collapsedCards.forEach(card => {
        card.classList.remove('collapsed');
        const content = card.querySelector('.card-content');
        if (content) {
          content.style.maxHeight = 'none';
          content.style.opacity = '1';
          content.style.padding = '0';
          content.style.margin = '0';
          content.style.pointerEvents = 'auto';
        }
      });

      // 컨테이너 여백 조정
      const container = document.querySelector('.container');
      if (container) {
        container.style.marginTop = '0';
        container.style.padding = '5mm';
      }

      // 인쇄 섹션 최적화
      const printSection = document.querySelector('.print-section');
      if (printSection) {
        printSection.style.pageBreakBefore = 'always';
        printSection.style.minHeight = 'auto';
        printSection.style.display = 'block';
        printSection.style.padding = '5mm';
      }

      // 스킬 태그들 강제 표시
      const skillTags = document.querySelectorAll('.skill-tag');
      skillTags.forEach(tag => {
        tag.style.background = '#3498db';
        tag.style.color = 'white';
        tag.style.display = 'inline-block';
        tag.style.fontSize = '0.75rem';
        tag.style.padding = '1mm 2mm';
        tag.style.borderRadius = '10px';
      });

      // 하이라이트 박스들 강제 표시
      const highlightBoxes = document.querySelectorAll('.highlight-box');
      highlightBoxes.forEach(box => {
        box.style.background = '#f8f9fa';
        box.style.borderLeft = '3px solid #3498db';
        box.style.padding = '3mm';
        box.style.margin = '3mm 0';
        box.style.fontSize = '0.8rem';
        box.style.pageBreakInside = 'avoid';
      });

      // 프로젝트 아이템들 강제 표시
      const projectItems = document.querySelectorAll('.project-item');
      projectItems.forEach(item => {
        item.style.background = '#f8f9fa';
        item.style.borderLeft = '2px solid #3498db';
        item.style.padding = '2mm';
        item.style.marginBottom = '3mm';
        item.style.fontSize = '0.8rem';
        item.style.pageBreakInside = 'avoid';
      });

      // 경험 아이템들 강제 표시
      const experienceItems = document.querySelectorAll('.experience-item');
      experienceItems.forEach(item => {
        item.style.background = '#f8f9fa';
        item.style.padding = '2mm';
        item.style.marginBottom = '3mm';
        item.style.fontSize = '0.8rem';
        item.style.pageBreakInside = 'avoid';
      });

             // 카드 텍스트 높이 조정
       const cardTexts = document.querySelectorAll('.card-text');
       cardTexts.forEach(text => {
         text.style.flex = 'none'; // 고정 높이 제거
         text.style.overflow = 'visible'; // 내용이 잘리지 않도록
         text.style.fontSize = '0.85rem';
         text.style.lineHeight = '1.5';
         text.style.marginBottom = '3mm';
         text.style.height = 'auto'; // 자동 높이 설정
       });
    });

    // intro-cards.html용 추가 대기 시간
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

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

  // Mermaid 다이어그램 폰트 강제 적용 - 더 포괄적이고 강력한 방법
  await page.evaluate(() => {
    const koreanFontStack = "'Noto Sans KR', 'Nanum Gothic', 'Nanum Gothic Coding', 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif";

    // 1. 모든 Mermaid 관련 요소에 폰트 적용
    const allMermaidElements = document.querySelectorAll('.mermaid, .mermaid *, .mermaid text, .mermaid svg text, .mermaid tspan');
    allMermaidElements.forEach(element => {
      element.style.fontFamily = koreanFontStack;
      if (element.tagName === 'text' || element.tagName === 'tspan') {
        element.setAttribute('font-family', koreanFontStack);
        element.style.fontFamily = koreanFontStack;
      }
    });

    // 2. SVG 내부의 모든 텍스트 요소에 직접 적용
    const allSvgTexts = document.querySelectorAll('svg text, svg tspan');
    allSvgTexts.forEach(text => {
      text.setAttribute('font-family', koreanFontStack);
      text.style.fontFamily = koreanFontStack;
    });

    // 3. 동적으로 생성된 Mermaid 요소들을 위한 스타일 강제 주입
    const style = document.createElement('style');
    style.textContent = `
      .mermaid text, .mermaid tspan, svg text, svg tspan,
      g[class*="actor"] text, g[class*="message"] text, g[class*="note"] text,
      .flowchart text, .sequence text {
        font-family: \${koreanFontStack} !important;
      }
    `;
    document.head.appendChild(style);

    // 4. MutationObserver로 동적 생성 요소 감지 및 폰트 적용
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            const texts = node.querySelectorAll ? node.querySelectorAll('text, tspan') : [];
            texts.forEach(text => {
              text.setAttribute('font-family', koreanFontStack);
              text.style.fontFamily = koreanFontStack;
            });
          }
        });
      });
    });

    // Mermaid 컨테이너들을 관찰
    document.querySelectorAll('.mermaid').forEach(mermaid => {
      observer.observe(mermaid, { childList: true, subtree: true });
    });
  });

  // 콘텐츠 렌더링 완료 대기 - Mermaid와 폰트 완전 로딩 보장
  await new Promise(resolve => setTimeout(resolve, 5000));

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
      // 한글 폰트 관련 추가 옵션
      '--font-render-hinting=none',
      '--disable-font-subpixel-positioning',
      '--enable-font-antialiasing',
      '--force-color-profile=srgb',
      '--disable-web-security',
      '--allow-running-insecure-content',
      '--disable-features=VizDisplayCompositor',
    ],
    headless: 'new',
  });

  try {
    const targets = [
      { url: `${baseUrl}/resume.html`, out: path.join(distDir, 'resume.pdf') },
      { url: `${baseUrl}/portfolio.html`, out: path.join(distDir, 'portfolio.pdf') },
      { url: `${baseUrl}/intro-cards.html`, out: path.join(distDir, 'intro-cards.pdf') },
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
