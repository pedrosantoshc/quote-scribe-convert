import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { QuoteData, FormData } from '../components/QuoteGenerator';
import { logPDFGeneration, waitForElementRender, validateElementVisibility, verifyPDFElements } from './pdfValidation';

// Updated PDF_SPECS with exact measurements to fix header cutting and table proportions
const PDF_SPECS = {
  PAGE: {
    WIDTH: 595,
    HEIGHT: 841,
    MARGINS: {
      TOP: 40,
      BOTTOM: 40,
      LEFT: 40,
      RIGHT: 40
    }
  },
  HEADER: {
    HEIGHT: 80,  // Exact height as requested
    LOGO_HEIGHT: 20,  // Perfect logo size
    FONT_SIZE: 8   // Reduced to 8px as requested
  },
  TABLE: {
    ROW_HEIGHT: 26,
    PADDING: 6,  // Reduced padding to match new header height
    FONT_SIZE: 8,
    HEADER_HEIGHT: 18,  // Significantly reduced from 28px to 18px
    HEADER_FONT_SIZE: 11
  },
  COLORS: {
    ONTOP_PINK: '#FF5A71',
    LIGHT_PINK: '#FFF1F3',
    BLUE_BG: '#EBF5FF',
    TEXT: '#1A1A1A',
    TEXT_LIGHT: '#4A5568'
  },
  VALIDATION: {
    MIN_HEIGHT: 35,
    MAX_HEIGHT: 1000,
    MIN_WIDTH: 400,
    MAX_WIDTH: 595
  }
};

const validatePDFElement = (element: HTMLElement, type: 'header' | 'table' | 'footer'): boolean => {
  logPDFGeneration(`Validating ${type} element`);
  
  const validation = {
    isValid: true,
    errors: [] as string[]
  };

  const rect = element.getBoundingClientRect();
  
  // Use more lenient validation for width to account for browser differences
  if (rect.width < PDF_SPECS.VALIDATION.MIN_WIDTH || 
      rect.width > PDF_SPECS.VALIDATION.MAX_WIDTH + 10) { // Add small tolerance
    validation.errors.push(`Invalid width: ${rect.width}px`);
    validation.isValid = false;
  }

  if (rect.height < PDF_SPECS.VALIDATION.MIN_HEIGHT || 
      rect.height > PDF_SPECS.VALIDATION.MAX_HEIGHT) {
    validation.errors.push(`Invalid height: ${rect.height}px`);
    validation.isValid = false;
  }

  const styles = window.getComputedStyle(element);
  
  if (type === 'header' && 
      !styles.backgroundColor.includes('255, 90, 113')) {
    validation.errors.push('Invalid header background color');
    validation.isValid = false;
  }

  if (type === 'footer' && 
      !styles.backgroundColor.includes('235, 245, 255')) {
    validation.errors.push('Invalid footer background color');
    validation.isValid = false;
  }

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

    // Create header with proper dimensions to prevent cutting
    const header = document.createElement('div');
    console.log('[PDF] Created header element');

    // Use exact measurements with proper height to prevent cutting
    const headerWidth = Math.floor(PDF_SPECS.PAGE.WIDTH);
    const headerHeight = Math.floor(PDF_SPECS.HEADER.HEIGHT);  // Now 80px
    
    header.style.cssText = `
      width: ${headerWidth}px;
      height: ${headerHeight}px;
      background-color: ${PDF_SPECS.COLORS.ONTOP_PINK} !important;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 ${PDF_SPECS.PAGE.MARGINS.LEFT}px;
      position: relative;
      box-sizing: border-box;
    `;
    
    header.setAttribute('class', 'ontop-header');
    console.log('[PDF] Set header styles');

    // Set current date and valid until date
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

    // Simple text logo as requested
    header.innerHTML = `
      <div style="height: ${headerHeight}px; display: flex; align-items: center; padding: 10px 0;">
        <div style="
          display: flex; 
          flex-direction: column;
          justify-content: center;
          padding: 5px;
        ">
          <div style="
            font-family: Arial, sans-serif;
            font-size: ${PDF_SPECS.HEADER.LOGO_HEIGHT}px;
            font-weight: bold;
            color: white;
            line-height: 1;
            margin-bottom: 2px;
          ">Ontop</div>
          <div style="
            font-family: Arial, sans-serif;
            font-size: ${PDF_SPECS.HEADER.FONT_SIZE}px;
            color: white;
            line-height: 1;
          ">Simple, Powerful, Global.</div>
        </div>
      </div>
      <div style="text-align: right">
        <p style="margin: 2px 0; font-size: ${PDF_SPECS.HEADER.FONT_SIZE}px; line-height: 1.2;">
          Quote Sender: ${formData.aeName}
        </p>
        <p style="margin: 2px 0; font-size: ${PDF_SPECS.HEADER.FONT_SIZE}px; line-height: 1.2;">
          Client Name: ${formData.clientName}
        </p>
        <p style="margin: 2px 0; font-size: ${PDF_SPECS.HEADER.FONT_SIZE}px; line-height: 1.2;">
          Valid Until: ${validUntil}
        </p>
      </div>
    `;
    
    // Create container for header with exact dimensions
    const container = document.createElement('div');
    container.style.cssText = `
      width: ${headerWidth}px;
      height: ${headerHeight}px;
      position: relative;
      overflow: hidden;
    `;
    container.appendChild(header);
    document.body.appendChild(container);
    
    console.log('[PDF] Header dimensions before capture:', {
      width: headerWidth,
      height: headerHeight,
      containerWidth: container.offsetWidth,
      containerHeight: container.offsetHeight
    });

    // Wait for element to render
    await waitForElementRender(container);
    logPDFGeneration('Header render completed');

    // Validate element visibility
    if (!validateElementVisibility(header)) {
      throw new Error('Header element is not visible after rendering');
    }

    // Initialize PDF with exact dimensions
    const doc = new jsPDF({
      format: 'a4',
      unit: 'pt'
    });

    let currentY = 0;

    // Validate and capture header
    if (validatePDFElement(header, 'header')) {
      console.log('[PDF] Starting header capture');
      
      // Capture header with explicit numeric dimensions
      const headerCanvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: PDF_SPECS.COLORS.ONTOP_PINK,
        logging: true,
        width: headerWidth,
        height: headerHeight,
        useCORS: true,
        allowTaint: false,
        onclone: (clonedDoc) => {
          const clonedHeader = clonedDoc.querySelector('.ontop-header');
          if (clonedHeader) {
            console.log('[PDF] Cloned header found and styled');
          }
        }
      });
      console.log('[PDF] Header captured');
      
      // Add header image with numeric dimensions
      console.log('[PDF] Adding header to PDF at Y:', currentY);
      doc.addImage(
        headerCanvas,
        'PNG',
        0,
        currentY,
        headerWidth,
        headerHeight
      );
      console.log('[PDF] Header added to PDF');
      
      currentY += headerHeight + 20;
      logPDFGeneration('Header added to PDF');
    } else {
      logPDFGeneration('Header validation failed, skipping');
    }

    // Clean up
    document.body.removeChild(container);
    console.log('[PDF] Header element removed');

    // Format Tables with proper targeting and CardHeader height control
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

      // Target actual table headers (th elements inside thead)
      clone.querySelectorAll('thead th').forEach(header => {
        (header as HTMLElement).style.cssText = `
          height: ${PDF_SPECS.TABLE.HEADER_HEIGHT}px !important;
          line-height: ${PDF_SPECS.TABLE.HEADER_HEIGHT}px !important;
          background-color: ${PDF_SPECS.COLORS.ONTOP_PINK} !important;
          color: white !important;
          font-size: ${PDF_SPECS.TABLE.HEADER_FONT_SIZE}px !important;
          padding: ${PDF_SPECS.TABLE.PADDING}px !important;
          margin: 0 !important;
          box-sizing: border-box !important;
          min-height: ${PDF_SPECS.TABLE.HEADER_HEIGHT}px !important;
          max-height: ${PDF_SPECS.TABLE.HEADER_HEIGHT}px !important;
        `;
      });

      // Target CardHeader elements specifically (the table titles like "Amount You Pay")
      clone.querySelectorAll('[class*="CardHeader"], .card-header, h3, h2').forEach(cardHeader => {
        if (cardHeader.textContent?.includes('Amount You Pay') || 
            cardHeader.textContent?.includes('Amount Employee Gets') || 
            cardHeader.textContent?.includes('Setup Summary')) {
          (cardHeader as HTMLElement).style.cssText = `
            height: ${PDF_SPECS.TABLE.HEADER_HEIGHT}px !important;
            line-height: ${PDF_SPECS.TABLE.HEADER_HEIGHT}px !important;
            background-color: ${PDF_SPECS.COLORS.ONTOP_PINK} !important;
            color: white !important;
            font-size: ${PDF_SPECS.TABLE.HEADER_FONT_SIZE}px !important;
            padding: ${PDF_SPECS.TABLE.PADDING}px !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            min-height: ${PDF_SPECS.TABLE.HEADER_HEIGHT}px !important;
            max-height: ${PDF_SPECS.TABLE.HEADER_HEIGHT}px !important;
            display: flex !important;
            align-items: center !important;
          `;
        }
      });

      // The subtotal rows will keep their existing pink styling from the original CSS

      return clone;
    };

    // Use validation utilities AFTER fixing the styles
    try {
      await verifyPDFElements();
    } catch (error) {
      logPDFGeneration('PDF verification failed', error);
      console.warn('PDF verification failed, continuing with generation');
    }

    // Add Tables with Proper Spacing
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

    // Add Footer with Important Notes
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
