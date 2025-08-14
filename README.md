# 박상준 - 자기소개 카드

실행력을 갖춘 풀스택 개발자 박상준의 자기소개 페이지입니다.

## 🌟 특징

- **두 가지 버전 제공**: 카드형(웹/네트워킹용) + 텍스트 기반 PDF(ATS용)
- **PDF 다운로드**: 원클릭으로 PDF 다운로드 가능
- **반응형 디자인**: 모바일, 태블릿, 데스크탑 모든 기기 지원
- **접근성 고려**: WCAG 기준 충족, 인쇄 최적화
- **GitHub Pages 배포**: 자동 배포 시스템

## 🎨 디자인 가이드라인

### 색상 제한 (2-3색)
- **배경**: 화이트/아이보리 (`#f8f9fa`, `#ffffff`)
- **본문**: 짙은 회색 (`#2c3e50`, `#495057`)
- **강조색**: 파랑 (`#3498db`)

### 타이포그래피
- **제목용**: Pretendard (굵은 폰트)
- **본문용**: 시스템 폰트 스택
- **최대 2-3 폰트로 제한**

### 정보 우선순위
1. **상단**: 이름 + 한 줄 요약
2. **핵심 기술**: 3-6개 기술 스택
3. **주요 프로젝트**: 각 1-2줄 + 링크
4. **경력 요약**: 회사·직책·기간·핵심 성과

## 🚀 사용법

### 웹에서 보기
1. GitHub Pages가 활성화되면 자동으로 배포됩니다
2. URL: `https://[username].github.io/[repository-name]`

### PDF 다운로드
1. 우상단의 "📄 PDF 다운로드" 버튼 클릭
2. 또는 키보드 단축키: `Ctrl+P` (Windows) / `Cmd+P` (Mac)

### 로컬에서 실행
```bash
# 저장소 클론
git clone https://github.com/[username]/[repository-name].git
cd [repository-name]

# 간단한 HTTP 서버 실행 (Python 3)
python -m http.server 8000

# 또는 Node.js 사용
npx serve .

# 브라우저에서 확인
open http://localhost:8000
```

## 📁 파일 구조

```
├── intro-cards.html          # 메인 HTML 파일
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Actions 워크플로우
├── README.md                 # 프로젝트 설명서
└── favicon.ico              # 파비콘 (선택사항)
```

## 🔧 커스터마이징

### 개인 정보 수정
`intro-cards.html` 파일에서 다음 부분을 수정하세요:

```html
<!-- 연락처 정보 -->
<a href="mailto:your.email@example.com">이메일</a>
<a href="https://github.com/yourusername">GitHub</a>
<a href="https://linkedin.com/in/yourusername">LinkedIn</a>

<!-- 프로젝트 링크 -->
<a href="https://your-portfolio.com">포트폴리오</a>
<a href="https://your-blog.com">기술 블로그</a>
```

### 기술 스택 수정
```html
<div class="skills-list">
  <span class="skill-tag">React</span>
  <span class="skill-tag">TypeScript</span>
  <!-- 원하는 기술 추가/수정 -->
</div>
```

### 색상 변경
CSS 변수를 수정하여 색상을 변경할 수 있습니다:

```css
:root {
  --primary-color: #3498db;    /* 강조색 */
  --text-color: #2c3e50;       /* 본문 색상 */
  --background-color: #f8f9fa; /* 배경색 */
}
```

## 🌐 배포

### GitHub Pages 설정
1. GitHub 저장소의 Settings → Pages
2. Source를 "Deploy from a branch"로 설정
3. Branch를 "gh-pages"로 설정
4. Save 클릭

### 자동 배포
- `main` 또는 `master` 브랜치에 푸시하면 자동으로 배포됩니다
- GitHub Actions가 자동으로 빌드하고 배포합니다

## 📱 반응형 지원

- **데스크탑**: 1200px 이상
- **태블릿**: 768px - 1199px
- **모바일**: 767px 이하

## 🖨️ 인쇄 최적화

- PDF 다운로드 시 불필요한 요소 자동 숨김
- A4 용지에 최적화된 레이아웃
- 인쇄 시 깔끔한 텍스트 기반 레이아웃

## 🔗 링크

- **포트폴리오**: [your-portfolio.com](https://your-portfolio.com)
- **GitHub**: [github.com/yourusername](https://github.com/yourusername)
- **LinkedIn**: [linkedin.com/in/yourusername](https://linkedin.com/in/yourusername)
- **기술 블로그**: [your-blog.com](https://your-blog.com)

## 📄 라이선스

MIT License - 자유롭게 사용하고 수정하세요!

---

**박상준** - 실행력을 갖춘 풀스택 개발자