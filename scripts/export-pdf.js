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
  try {
    // 1단계: 머메이드 라이브러리 로딩 확인
    await page.waitForFunction(() => {
      return typeof mermaid !== 'undefined';
    }, { timeout: 10000, polling: 200 });

    // 2단계: 기본 SVG 존재 확인
    await page.waitForFunction(() => {
      try {
        const diagrams = Array.from(document.querySelectorAll('.mermaid'));
        if (diagrams.length === 0) return true;
        return diagrams.every((d) => d.querySelector('svg'));
      } catch (error) {
        console.log('Error in SVG check:', error);
        return true; // 에러 발생시 통과
      }
    }, { timeout: 20000, polling: 300 });

    // 3단계: SVG 내부 요소들이 완전히 렌더링되었는지 확인
    await page.waitForFunction(() => {
      try {
        const diagrams = Array.from(document.querySelectorAll('.mermaid'));
        if (diagrams.length === 0) return true;
        
        return diagrams.every((diagram) => {
          try {
            const svg = diagram.querySelector('svg');
            if (!svg) return false;
            
            // SVG 내부에 실제 콘텐츠(path, rect, text 등)가 있는지 확인
            const hasContent = svg.querySelectorAll('path, rect, text, circle, line, g').length > 3;
            const rect = svg.getBoundingClientRect();
            const hasValidDimensions = rect.width > 100 && rect.height > 50;
            
            return hasContent && hasValidDimensions;
          } catch (diagramError) {
            console.log('Error checking diagram:', diagramError);
            return true; // 개별 다이어그램 에러시 통과
          }
        });
      } catch (error) {
        console.log('Error in content check:', error);
        return true; // 에러 발생시 통과
      }
    }, { timeout: 25000, polling: 500 });

    // 4단계: 추가 안정화 시간 - 머메이드 애니메이션 완료 대기
    await new Promise(resolve => setTimeout(resolve, 4000));
  } catch (waitError) {
    console.warn('Mermaid wait function failed, but continuing:', waitError.message);
    // 대기 실패해도 진행
  }
}

async function ensureFonts(page) {
  // Inject multiple font sources for better compatibility
  await page.addStyleTag({
    content: `
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap');
      @import url('https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap');
      
      /* Global Korean font fallback */
      * {
        font-family: 'Noto Sans KR', 'Nanum Gothic', 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif !important;
      }
      
      /* Mermaid 다이어그램 한글 폰트 설정 - 더 강력한 적용 */
      .mermaid, .mermaid *, .mermaid text, .mermaid svg, .mermaid svg text, 
      .mermaid tspan, .mermaid .actor, .mermaid .messageText, .mermaid .noteText {
        font-family: 'Noto Sans KR', 'Nanum Gothic', 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif !important;
      }
      
      /* 더 구체적인 머메이드 선택자들 */
      g[class*="actor"] text,
      g[class*="message"] text,
      g[class*="note"] text,
      .flowchart text,
      .sequence text {
        font-family: 'Noto Sans KR', 'Nanum Gothic', 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif !important;
      }
    `
  });
  
  // 폰트 로딩 완료 대기 - 더 오래 기다림
  await page.evaluate(() => {
    return document.fonts.ready;
  });
  
  // 추가 폰트 로딩 대기
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function exportPage(browser, url, outPath) {
  console.log(`📄 Starting export: ${url}`);
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

  try {
    console.log(`🌐 Loading page: ${url}`);
    await page.goto(url, { waitUntil: ['load', 'domcontentloaded', 'networkidle0'] });
    console.log(`✅ Page loaded successfully: ${url}`);
  } catch (error) {
    console.error(`❌ Failed to load page ${url}:`, error.message);
    throw error;
  }
  await ensureFonts(page);
  
  // 머메이드 강제 초기화 및 렌더링 (완전히 새로운 접근)
  try {
    console.log(`🔄 Processing Mermaid diagrams...`);
    await page.evaluate(() => {
      try {
        // 머메이드 라이브러리 로딩 확인 및 강제 초기화
        if (typeof mermaid !== 'undefined') {
          console.log('Mermaid library found, processing diagrams...');
          
          // 머메이드 설정 강제 적용
          mermaid.initialize({
            startOnLoad: false, // 수동 렌더링을 위해 비활성화
            theme: 'base',
            maxTextSize: 90000,
            maxWidth: 1200,
            flowchart: {
              useMaxWidth: true,
              htmlLabels: true,
              curve: 'basis'
            },
            sequence: {
              useMaxWidth: true,
              wrap: true
            },
            themeVariables: {
              primaryColor: '#667eea',
              primaryTextColor: '#2d3748',
              primaryBorderColor: '#667eea',
              lineColor: '#cbd5e0',
              sectionBkgColor: '#f7fafc',
              altSectionBkgColor: '#edf2f7',
              gridColor: '#e2e8f0',
              tertiaryColor: '#f7fafc',
              fontFamily: "'Noto Sans KR', sans-serif",
              primaryTextSize: '18px',
              secondaryTextSize: '16px',
              tertiaryTextSize: '14px'
            }
          });
          
          // 모든 머메이드 다이어그램 찾기
          const diagrams = document.querySelectorAll('.mermaid');
          console.log(`Found ${diagrams.length} mermaid diagrams`);
          
          // 각 다이어그램을 개별적으로 렌더링
          diagrams.forEach((diagram, index) => {
            try {
              // 기존 내용 제거
              diagram.innerHTML = diagram.textContent || diagram.innerText;
              
              // data-processed 속성 제거
              diagram.removeAttribute('data-processed');
              
              // 개별 다이어그램 렌더링
              mermaid.render(`mermaid-${index}`, diagram.textContent || diagram.innerText).then(({ svg }) => {
                diagram.innerHTML = svg;
                console.log(`Rendered diagram ${index} successfully`);
              }).catch((error) => {
                console.error(`Failed to render diagram ${index}:`, error);
              });
              
            } catch (diagramError) {
              console.error(`Error processing diagram ${index}:`, diagramError);
            }
          });
          
          console.log('Mermaid initialization and rendering completed');
        } else {
          console.log('Mermaid library not found, skipping diagram processing');
        }
      } catch (evaluateError) {
        console.error('Error in mermaid evaluation:', evaluateError);
      }
    });
    console.log(`✅ Mermaid processing completed`);
  } catch (mermaidError) {
    console.warn(`⚠️  Mermaid processing failed, continuing without diagrams:`, mermaidError.message);
    // 머메이드 실패해도 PDF 생성은 계속 진행
  }
  
  // 머메이드 렌더링 완료 대기 (안전장치 추가)
  try {
    console.log(`⏳ Waiting for Mermaid diagrams to render...`);
    await waitForMermaid(page);
    console.log(`✅ Mermaid diagrams rendering completed`);
  } catch (waitError) {
    console.warn(`⚠️  Mermaid wait failed, proceeding with PDF generation:`, waitError.message);
    // 머메이드 대기 실패해도 PDF 생성은 계속 진행
  }
  
  // intro-cards.html 특별 처리
  if (url.includes('intro-cards.html')) {
    await page.evaluate(() => {
      // PDF 생성 시 숨길 요소들 처리
      const pdfHiddenElements = document.querySelectorAll('.pdf-hidden');
      pdfHiddenElements.forEach(el => {
        el.style.display = 'none';
      });
      
      // 카드 레이아웃 최적화
      const cards = document.querySelectorAll('.card');
      cards.forEach(card => {
        card.style.pageBreakInside = 'avoid';
        card.style.breakInside = 'avoid';
      });
      
      // 인쇄 섹션 최적화
      const printSection = document.querySelector('.print-section');
      if (printSection) {
        printSection.style.pageBreakBefore = 'always';
      }
    });
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
  
  // Mermaid 다이어그램 폰트 강제 적용 - 더 포괄적이고 강력한 방법 (에러 처리 강화)
  try {
    console.log(`🎨 Applying Korean fonts to Mermaid diagrams...`);
    await page.evaluate(() => {
      try {
        const koreanFontStack = "'Noto Sans KR', 'Nanum Gothic', 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif";
    
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
        font-family: ${koreanFontStack} !important;
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
      } catch (fontError) {
        console.error('Error applying fonts to Mermaid:', fontError);
      }
    });
    console.log(`✅ Korean font application completed`);
  } catch (fontApplyError) {
    console.warn(`⚠️  Font application failed, continuing:`, fontApplyError.message);
  }

  // 머메이드 렌더링 상태 디버깅
  await page.evaluate(() => {
    const diagrams = document.querySelectorAll('.mermaid');
    console.log(`Found ${diagrams.length} mermaid diagrams`);
    diagrams.forEach((diagram, index) => {
      const svg = diagram.querySelector('svg');
      if (svg) {
        const rect = svg.getBoundingClientRect();
        console.log(`Diagram ${index}: SVG dimensions ${rect.width}x${rect.height}, elements: ${svg.querySelectorAll('*').length}`);
      } else {
        console.log(`Diagram ${index}: No SVG found`);
      }
    });
  });

  // 콘텐츠 렌더링 완료 대기 - Mermaid와 폰트 완전 로딩 보장
  await new Promise(resolve => setTimeout(resolve, 12000));

  await page.emulateMediaType('screen');

  console.log(`📄 Generating PDF: ${outPath}`);
  try {
    await page.pdf({
      path: outPath,
      printBackground: true,
      preferCSSPageSize: false,
      width: '210mm',
      height: '500mm',  // 매우 긴 페이지로 설정
      margin: { top: '15mm', right: '12mm', bottom: '15mm', left: '12mm' },
      displayHeaderFooter: false,
    });
    console.log(`✅ PDF generated successfully: ${outPath}`);
  } catch (error) {
    console.error(`❌ Failed to generate PDF ${outPath}:`, error.message);
    throw error;
  }

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
      { name: 'resume', url: `${baseUrl}/resume.html`, out: path.join(distDir, 'resume.pdf') },
      { name: 'portfolio', url: `${baseUrl}/portfolio.html`, out: path.join(distDir, 'portfolio.pdf') },
      { name: 'resume-horizontal', url: `${baseUrl}/resume-horizontal.html`, out: path.join(distDir, 'resume-horizontal.pdf') },
      { name: 'portfolio-horizontal', url: `${baseUrl}/portfolio-horizontal.html`, out: path.join(distDir, 'portfolio-horizontal.pdf') },
      { name: 'intro-cards', url: `${baseUrl}/intro-cards.html`, out: path.join(distDir, 'intro-cards.pdf') },
    ];

    // 순차 처리로 안정성 확보 (에러 발생시 개별 처리)
    for (const target of targets) {
      try {
        console.log(`🔄 Exporting ${target.name}: ${target.url} -> ${target.out}`);
        await exportPage(browser, target.url, target.out);
        console.log(`✅ Successfully exported ${target.name}`);
      } catch (error) {
        console.error(`❌ Failed to export ${target.name}:`, error.message);
        // 개별 파일 실패해도 계속 진행
        continue;
      }
    }

    console.log('🎉 PDF export process complete. Check ./dist for generated files');
  } catch (e) {
    console.error('PDF export failed:', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
})();
