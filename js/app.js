// PDF Download Function using html2pdf.js
function downloadPDF() {
  const btn = document.querySelector('.print-btn');
  const btnText = btn.querySelector('.text');
  const originalBtnText = btnText.textContent;

  // Show loading state
  btnText.textContent = 'PDF 생성 중...';
  btn.disabled = true;

  // Select the main content areas
  const sidebar = document.querySelector('.sidebar');
  const mainContent = document.querySelector('.main-content');

  // Create a wrapper element to combine both sections for PDF generation
  const element = document.createElement('div');
  element.style.width = '480px'; // Force mobile width
  element.style.padding = '20px';

  const clonedSidebar = sidebar.cloneNode(true);
  const clonedMainContent = mainContent.cloneNode(true);

  // Apply styles to the wrapper to mimic mobile layout (vertical stacking)
  element.style.display = 'block';
  
  // In mobile view, main content comes first, then sidebar
  element.appendChild(clonedMainContent);
  element.appendChild(clonedSidebar);
  
  // Temporarily append to the body to render for html2pdf
  document.body.appendChild(element);

  // Determine filename based on the page title
  const title = document.title;
  let filename = 'document_mobile.pdf';
  if (title.includes('이력서')) {
    filename = '박상준_이력서_mobile.pdf';
  } else if (title.includes('포트폴리오')) {
    filename = '박상준_포트폴리오_mobile.pdf';
  }
  
  // html2pdf options
  const opt = {
    margin:       [0.5, 0.5, 0.5, 0.5],
    filename:     filename,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { 
      scale: 2, 
      useCORS: true, 
      logging: true, 
      letterRendering: true,
      onclone: (doc) => {
        // Re-render mermaid diagrams in the cloned document
        const mermaidElements = doc.querySelectorAll('.mermaid');
        mermaidElements.forEach((el, index) => {
          const originalSvg = document.querySelectorAll('.mermaid svg')[index];
          if (originalSvg) {
            el.innerHTML = originalSvg.outerHTML;
          }
        });
      }
    },
    jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  // Generate PDF
  html2pdf().from(element).set(opt).save().then(() => {
    // Restore button state
    btnText.textContent = originalBtnText;
    btn.disabled = false;
    // Clean up the temporary element
    document.body.removeChild(element);
  });
}


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
        <button class="mermaid-modal-close" type="button">✕</button>
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
  
  // Add click event to close button
  const closeBtn = modal.querySelector('.mermaid-modal-close');
  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeMermaidModal();
  });
  
  // Add ESC key event
  const handleEscKey = (e) => {
    if (e.key === 'Escape') {
      closeMermaidModal();
      document.removeEventListener('keydown', handleEscKey);
    }
  };
  document.addEventListener('keydown', handleEscKey);
  
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
    // Remove show class to trigger fade out animation
    modal.classList.remove('show');
    
    // Wait for animation to complete then remove from DOM
    setTimeout(() => {
      if (modal && modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
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
