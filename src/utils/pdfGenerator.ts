
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { QuoteData, FormData } from '../components/QuoteGenerator';
import { logPDFGeneration, waitForElementRender, validateElementVisibility, verifyPDFElements } from './pdfValidation';

const PDF_SPECS = {
  PAGE: {
    WIDTH: 595.28,  // A4 width in points
    HEIGHT: 841.89, // A4 height in points
    MARGINS: {
      TOP: 40,
      BOTTOM: 40,
      LEFT: 40,
      RIGHT: 40
    }
  },
  HEADER: {
    HEIGHT: 80,
    LOGO_HEIGHT: 32,
    TEXT_SIZE: 10
  },
  TABLE: {
    ROW_HEIGHT: 28,
    PADDING: 8,
    FONT_SIZE: 8,
    HEADER_HEIGHT: 40,  // Reduced from original size
    HEADER_FONT_SIZE: 14  // Control "Amount You Pay" text size
  },
  COLORS: {
    ONTOP_PINK: '#FF5A71',
    LIGHT_PINK: '#FFF1F3',
    BLUE_BG: '#EBF5FF',
    TEXT: '#1A1A1A',
    TEXT_LIGHT: '#4A5568'
  },
  VALIDATION: {
    MIN_HEIGHT: 35,    // Minimum row height
    MAX_HEIGHT: 1000,  // Maximum section height
    MIN_WIDTH: 400,    // Minimum content width
    MAX_WIDTH: 595     // Maximum content width (A4)
  }
};

const validatePDFElement = (element: HTMLElement, type: 'header' | 'table' | 'footer'): boolean => {
  logPDFGeneration(`Validating ${type} element`);
  
  const validation = {
    isValid: true,
    errors: [] as string[]
  };

  // Check dimensions
  const rect = element.getBoundingClientRect();
  
  if (rect.width < PDF_SPECS.VALIDATION.MIN_WIDTH || 
      rect.width > PDF_SPECS.VALIDATION.MAX_WIDTH) {
    validation.errors.push(`Invalid width: ${rect.width}px`);
    validation.isValid = false;
  }

  if (rect.height < PDF_SPECS.VALIDATION.MIN_HEIGHT || 
      rect.height > PDF_SPECS.VALIDATION.MAX_HEIGHT) {
    validation.errors.push(`Invalid height: ${rect.height}px`);
    validation.isValid = false;
  }

  // Check styles
  const styles = window.getComputedStyle(element);
  
  // Fix RGB color checking - check if color contains the RGB values instead of exact match
  if (type === 'header' && 
      !styles.backgroundColor.includes('255, 90, 113')) { // Check for Ontop pink RGB
    validation.errors.push('Invalid header background color');
    validation.isValid = false;
  }

  if (type === 'footer' && 
      !styles.backgroundColor.includes('235, 245, 255')) { // Check for blue background RGB
    validation.errors.push('Invalid footer background color');
    validation.isValid = false;
  }

  // Log any validation errors
  if (!validation.isValid) {
    console.error(`PDF ${type} validation failed:`, validation.errors);
  } else {
    logPDFGeneration(`${type} validation passed`);
  }

  return validation.isValid;
};

export const generateQuotePDF = async (formData: FormData) => {
  try {
    console.log('[PDF] Starting PDF generation at:', new Date().toISOString());
    logPDFGeneration('Starting PDF generation', { formData });

    // Initialize PDF
    const doc = new jsPDF({
      format: 'a4',
      unit: 'pt'
    });

    let currentY = 0;
    
    // Set current date in a consistent format
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // 1. Generate Header Banner with proper positioning and logging
    console.log('[PDF] Creating header element');
    const header = document.createElement('div');
    
    // IMPORTANT: Set background color BEFORE adding class
    header.style.cssText = `
      width: ${PDF_SPECS.PAGE.WIDTH}px;
      height: ${PDF_SPECS.HEADER.HEIGHT}px;
      background-color: ${PDF_SPECS.COLORS.ONTOP_PINK} !important;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 ${PDF_SPECS.PAGE.MARGINS.LEFT}px;
      box-sizing: border-box;
    `;
    
    // Add class after setting styles
    header.setAttribute('class', 'ontop-header');
    console.log('[PDF] Set header styles');
    
    header.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px;">
        <img 
          src="/ontop-logo-white.svg"
          alt="Ontop"
          style="height: 30px; width: auto;"
        />
        <div>
          <h1 style="font-size: 18px; margin: 0; font-weight: bold;">Ontop</h1>
          <p style="font-size: 14px; margin: 0; opacity: 0.9;">
            Global Employment Solutions
          </p>
        </div>
      </div>
      <div style="text-align: right; font-size: 12px;">
        <p style="margin: 4px 0;">Quote Sender: ${formData.aeName}</p>
        <p style="margin: 4px 0;">Client Name: ${formData.clientName}</p>
        <p style="margin: 4px 0;">Valid Until: ${validUntil}</p>
        <p style="margin: 4px 0;">Generated: ${currentDate}</p>
      </div>
    `;
    console.log('[PDF] Set header content');

    document.body.appendChild(header);
    console.log('[PDF] Appended header to body');

    // Wait a moment for styles to apply
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Log header dimensions before capture
    const headerRect = header.getBoundingClientRect();
    console.log('[PDF] Header dimensions:', {
      width: headerRect.width,
      height: headerRect.height,
      background: window.getComputedStyle(header).backgroundColor
    });

    // Wait for element to render
    await waitForElementRender(header);
    logPDFGeneration('Header render completed');

    // Validate element visibility
    if (!validateElementVisibility(header)) {
      throw new Error('Header element is not visible after rendering');
    }

    // Validate and add header
    if (validatePDFElement(header, 'header')) {
      console.log('[PDF] Starting header capture');
      const headerCanvas = await html2canvas(header, {
        scale: 2,
        backgroundColor: PDF_SPECS.COLORS.ONTOP_PINK,
        logging: true,
        useCORS: true,
        allowTaint: false,
        width: PDF_SPECS.PAGE.WIDTH,
        height: PDF_SPECS.HEADER.HEIGHT
      });
      console.log('[PDF] Header captured');
      
      console.log('[PDF] Adding header to PDF at Y:', currentY);
      doc.addImage(
        headerCanvas, 
        'PNG', 
        0, 
        currentY, 
        PDF_SPECS.PAGE.WIDTH, 
        PDF_SPECS.HEADER.HEIGHT
      );
      console.log('[PDF] Header added to PDF');
      
      currentY += PDF_SPECS.HEADER.HEIGHT + 20;
      logPDFGeneration('Header added to PDF');
    } else {
      logPDFGeneration('Header validation failed, skipping');
    }

    document.body.removeChild(header);
    console.log('[PDF] Header element removed');

    // 2. Format Tables with fixed header sizes
    const formatTable = (table: HTMLElement) => {
      const clone = table.cloneNode(true) as HTMLElement;
      clone.style.cssText = `
        width: ${PDF_SPECS.PAGE.WIDTH - (PDF_SPECS.PAGE.MARGINS.LEFT + PDF_SPECS.PAGE.MARGINS.RIGHT)}px;
        font-size: ${PDF_SPECS.TABLE.FONT_SIZE}px;
        border-collapse: collapse;
      `;
      
      clone.querySelectorAll('tr').forEach(row => {
        (row as HTMLElement).style.height = `${PDF_SPECS.TABLE.ROW_HEIGHT}px`;
      });

      clone.querySelectorAll('td, th').forEach(cell => {
        (cell as HTMLElement).style.cssText = `
          padding: ${PDF_SPECS.TABLE.PADDING}px;
          font-size: ${PDF_SPECS.TABLE.FONT_SIZE}px;
          line-height: 1.2;
          ${cell.classList.contains('text-right') ? 'text-align: right;' : ''}
        `;
      });

      // Fix the table header styling with specific measurements
      clone.querySelectorAll('.table-header').forEach(header => {
        (header as HTMLElement).style.cssText = `
          height: ${PDF_SPECS.TABLE.HEADER_HEIGHT}px;
          line-height: ${PDF_SPECS.TABLE.HEADER_HEIGHT}px;
          background-color: ${PDF_SPECS.COLORS.ONTOP_PINK};
          color: white;
          font-size: ${PDF_SPECS.TABLE.HEADER_FONT_SIZE}px;
          padding: 0 12px;
          margin: 0;
        `;
      });

      return clone;
    };

    // Use validation utilities AFTER fixing the styles
    try {
      await verifyPDFElements();
    } catch (error) {
      logPDFGeneration('PDF verification failed', error);
      console.warn('PDF verification failed, continuing with generation');
    }

    // 3. Add Tables with Proper Spacing
    const tables = [
      '.amount-you-pay',
      '.amount-employee-gets',
      '.setup-summary-container'
    ];

    for (const tableSelector of tables) {
      logPDFGeneration(`Processing table: ${tableSelector}`);
      const table = document.querySelector(tableSelector);
      if (!table) {
        logPDFGeneration(`Table not found: ${tableSelector}`);
        continue;
      }

      const formattedTable = formatTable(table as HTMLElement);
      document.body.appendChild(formattedTable);
      
      await waitForElementRender(formattedTable);
      
      if (validatePDFElement(formattedTable, 'table')) {
        // Check if need new page
        if (currentY + formattedTable.offsetHeight > PDF_SPECS.PAGE.HEIGHT - PDF_SPECS.PAGE.MARGINS.BOTTOM) {
          doc.addPage();
          currentY = PDF_SPECS.PAGE.MARGINS.TOP;
          logPDFGeneration('Added new page for table');
        }

        const tableCanvas = await html2canvas(formattedTable, {
          scale: 2,
          backgroundColor: null,
          logging: false,
          useCORS: true
        });

        doc.addImage(
          tableCanvas,
          'PNG',
          PDF_SPECS.PAGE.MARGINS.LEFT,
          currentY,
          PDF_SPECS.PAGE.WIDTH - (PDF_SPECS.PAGE.MARGINS.LEFT + PDF_SPECS.PAGE.MARGINS.RIGHT),
          tableCanvas.height / 2
        );

        currentY += (tableCanvas.height / 2) + 20;
        logPDFGeneration(`Table ${tableSelector} added to PDF`);
      }

      document.body.removeChild(formattedTable);
    }

    // 4. Add Footer with Important Notes
    logPDFGeneration('Creating footer element');
    const footer = document.createElement('div');
    footer.style.cssText = `
      margin: ${PDF_SPECS.PAGE.MARGINS.LEFT}px;
      padding: 24px;
      background-color: ${PDF_SPECS.COLORS.BLUE_BG};
      border-radius: 8px;
      font-size: ${PDF_SPECS.TABLE.FONT_SIZE}px;
      width: ${PDF_SPECS.PAGE.WIDTH - (PDF_SPECS.PAGE.MARGINS.LEFT + PDF_SPECS.PAGE.MARGINS.RIGHT) - 48}px;
      box-sizing: border-box;
    `;

    footer.innerHTML = `
      <h3 style="color: #2B4B80; margin-bottom: 12px; font-weight: 500; font-size: ${PDF_SPECS.TABLE.FONT_SIZE + 2}px;">Important Notes:</h3>
      <ul style="color: #2B4B80; margin: 0; padding-left: 20px; line-height: 1.5;">
        <li style="margin-bottom: 8px;">Currency conversions based on rates on ${currentDate}, may vary—contracts always in local currency.</li>
        <li style="margin-bottom: 8px;">Setup Cost = one month's salary (Security Deposit) + Ontop fee; secures Ontop against potential defaults.</li>
        <li style="margin-bottom: 8px;">Dismissal Deposit = one-twelfth of salary, provisioned for future termination costs.</li>
      </ul>
      <p style="color: #64748B; margin-top: 16px; font-size: ${PDF_SPECS.TABLE.FONT_SIZE - 1}px;">
        Generated by Ontop Quote Generator • ${currentDate}
      </p>
    `;

    document.body.appendChild(footer);
    await waitForElementRender(footer);

    // Validate and add footer
    if (validatePDFElement(footer, 'footer')) {
      // Check if need new page for footer
      if (currentY + 200 > PDF_SPECS.PAGE.HEIGHT - PDF_SPECS.PAGE.MARGINS.BOTTOM) {
        doc.addPage();
        currentY = PDF_SPECS.PAGE.MARGINS.TOP;
        logPDFGeneration('Added new page for footer');
      }

      const footerCanvas = await html2canvas(footer, {
        scale: 2,
        backgroundColor: PDF_SPECS.COLORS.BLUE_BG,
        logging: false,
        useCORS: true
      });

      doc.addImage(
        footerCanvas,
        'PNG',
        PDF_SPECS.PAGE.MARGINS.LEFT,
        currentY,
        PDF_SPECS.PAGE.WIDTH - (PDF_SPECS.PAGE.MARGINS.LEFT + PDF_SPECS.PAGE.MARGINS.RIGHT),
        footerCanvas.height / 2
      );
      
      logPDFGeneration('Footer added to PDF');
    }

    document.body.removeChild(footer);
    logPDFGeneration('PDF generation completed successfully');

    return doc;
  } catch (error) {
    logPDFGeneration('Error generating PDF', error);
    console.error('Error generating PDF:', error);
    throw error;
  }
};

// Legacy function for backward compatibility
export const generatePDF = async (element: HTMLElement, data: QuoteData, formData: FormData): Promise<void> => {
  try {
    logPDFGeneration('Legacy generatePDF called');
    const doc = await generateQuotePDF(formData);
    const fileName = `Ontop-Quote-${formData.clientName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    logPDFGeneration('PDF saved successfully', { fileName });
  } catch (error) {
    logPDFGeneration('Error in legacy generatePDF', error);
    console.error('Error generating PDF:', error);
    throw error;
  }
};
