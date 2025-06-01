
const PDF_VERIFICATION = {
  // Required elements that must exist before generation
  REQUIRED_ELEMENTS: {
    HEADER: '.ontop-header',
    TABLES: ['.amount-you-pay', '.amount-employee-gets', '.setup-summary']
  },
  
  // Visual specs that must be enforced
  VISUAL_SPECS: {
    HEADER_HEIGHT: 80,
    TABLE_HEADER_HEIGHT: 35,
    MARGINS: { TOP: 40, BOTTOM: 40, LEFT: 40, RIGHT: 40 }
  }
};

export const verifyPDFElements = () => {
  console.log('[PDF Verification] Starting pre-generation checks...');
  
  // 1. Check Header
  const header = document.querySelector(PDF_VERIFICATION.REQUIRED_ELEMENTS.HEADER);
  if (!header) {
    console.error('[PDF Verification] Header element missing');
    throw new Error('PDF header element not found');
  }
  
  // 2. Check Tables
  PDF_VERIFICATION.REQUIRED_ELEMENTS.TABLES.forEach(tableSelector => {
    const table = document.querySelector(tableSelector);
    if (!table) {
      console.error(`[PDF Verification] Table missing: ${tableSelector}`);
      throw new Error(`Required table not found: ${tableSelector}`);
    }
  });
  
  // 3. Check Logo
  const logo = document.querySelector('img[src="/ontop-logo-white.svg"]');
  if (!logo) {
    console.error('[PDF Verification] Ontop logo missing');
    throw new Error('Ontop logo not found');
  }

  console.log('[PDF Verification] All required elements present');
  return true;
};

export const verifyPDFDimensions = (elements: HTMLElement[]) => {
  elements.forEach(el => {
    const rect = el.getBoundingClientRect();
    console.log(`[PDF Dimensions] Element ${el.className}:`, {
      width: rect.width,
      height: rect.height,
      expectedHeight: el.classList.contains('ontop-header') ? 
        PDF_VERIFICATION.VISUAL_SPECS.HEADER_HEIGHT : 
        PDF_VERIFICATION.VISUAL_SPECS.TABLE_HEADER_HEIGHT
    });
  });
};

export const logPDFGeneration = (step: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${step}`, data || '');
};

// Additional utility to wait for element to be rendered
export const waitForElementRender = (element: HTMLElement): Promise<void> => {
  return new Promise((resolve) => {
    // Use requestAnimationFrame to ensure the element is rendered
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
};

// Utility to check if element is visible and has dimensions
export const validateElementVisibility = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  const styles = window.getComputedStyle(element);
  
  const isVisible = styles.display !== 'none' && 
                   styles.visibility !== 'hidden' && 
                   styles.opacity !== '0' &&
                   rect.width > 0 && 
                   rect.height > 0;
  
  console.log(`[PDF Validation] Element visibility check:`, {
    display: styles.display,
    visibility: styles.visibility,
    opacity: styles.opacity,
    width: rect.width,
    height: rect.height,
    isVisible
  });
  
  return isVisible;
};
