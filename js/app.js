// Print Resume Function
function printResume() {
  // Show print instructions modal
  showPrintInstructions();
  
  // Add a small delay then trigger print
  setTimeout(() => {
    window.print();
  }, 1000);
}

// Show print instructions
function showPrintInstructions() {
  // Create modal element
  const modal = document.createElement('div');
  modal.className = 'print-modal';
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closePrintModal()"></div>
    <div class="print-modal-content">
      <h3>📋 프린트 설정 안내</h3>
      <div class="print-instructions">
        <div class="instruction-item">
          <span class="icon">🎨</span>
          <span class="text"><strong>배경 그래픽:</strong> 반드시 "켜기"로 설정 (기술 스택 바 표시용)</span>
        </div>
        <div class="instruction-item">
          <span class="icon">📄</span>
          <span class="text"><strong>머리글/바닥글:</strong> "끄기"로 설정</span>
        </div>
        <div class="instruction-item">
          <span class="icon">📐</span>
          <span class="text"><strong>여백:</strong> "최소" 또는 "사용자 지정" 권장</span>
        </div>
        <div class="instruction-item">
          <span class="icon">📏</span>
          <span class="text"><strong>크기:</strong> A4 권장</span>
        </div>
        <div class="instruction-item">
          <span class="icon">⚠️</span>
          <span class="text"><strong>중요:</strong> 기술 스택 진행바가 안 보이면 "배경 그래픽" 설정을 확인하세요</span>
        </div>
      </div>
      <button class="modal-close" onclick="closePrintModal()">확인 ✓</button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add show class for animation
  setTimeout(() => {
    modal.classList.add('show');
  }, 10);
}

// Close print modal
function closePrintModal() {
  const modal = document.querySelector('.print-modal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.remove();
    }, 300);
  }
}

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closePrintModal();
    closeMermaidModal();
  }
});

// Mermaid Diagram Modal Functions
function openMermaidModal(diagramElement) {
  // Get the rendered SVG from the existing diagram
  const existingSvg = diagramElement.querySelector('svg');
  if (!existingSvg) {
    console.error('No SVG found in diagram');
    return;
  }
  
  // Clone the SVG
  const clonedSvg = existingSvg.cloneNode(true);
  
  // Get diagram title from nearest section header
  const nearestSection = diagramElement.closest('.content-card');
  const sectionTitle = nearestSection ? nearestSection.querySelector('.card-title').textContent : '다이어그램';
  
  // Create modal element
  const modal = document.createElement('div');
  modal.className = 'mermaid-modal';
  
  modal.innerHTML = `
    <div class="mermaid-modal-content">
      <div class="mermaid-modal-header">
        <h3 class="mermaid-modal-title">${sectionTitle} - 아키텍처 다이어그램</h3>
        <button class="mermaid-modal-close" onclick="closeMermaidModal()">✕</button>
      </div>
      <div class="mermaid-diagram-large">
        <div class="mermaid-large"></div>
      </div>
    </div>
  `;
  
  // Add click event to modal background (not content)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeMermaidModal();
    }
  });
  
  document.body.appendChild(modal);
  
  // Add the cloned SVG
  const largeContainer = modal.querySelector('.mermaid-large');
  largeContainer.appendChild(clonedSvg);
  
  // Make SVG fill the available space
  clonedSvg.style.width = '100%';
  clonedSvg.style.height = '100%';
  clonedSvg.style.maxWidth = 'none';
  clonedSvg.style.maxHeight = 'none';
  clonedSvg.removeAttribute('width');
  clonedSvg.removeAttribute('height');
  clonedSvg.setAttribute('viewBox', clonedSvg.getAttribute('viewBox') || '0 0 800 600');
  clonedSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  
  // Add show class for animation
  setTimeout(() => {
    modal.classList.add('show');
  }, 10);
}

// Close mermaid modal
function closeMermaidModal() {
  const modal = document.querySelector('.mermaid-modal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.remove();
    }, 300);
  }
}

// Add click event listeners to all mermaid diagrams
document.addEventListener('DOMContentLoaded', function() {
  // Wait for mermaid to initialize
  setTimeout(() => {
    const mermaidDiagrams = document.querySelectorAll('.mermaid-diagram');
    mermaidDiagrams.forEach(diagram => {
      diagram.addEventListener('click', () => {
        openMermaidModal(diagram);
      });
    });
  }, 1000);
});
