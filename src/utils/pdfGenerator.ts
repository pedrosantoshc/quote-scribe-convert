
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { QuoteData, FormData } from '../components/QuoteGenerator';

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
    HEADING_HEIGHT: 35
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
  }

  return validation.isValid;
};

export const generateQuotePDF = async (formData: FormData) => {
  try {
    // Initialize PDF
    const doc = new jsPDF({
      format: 'a4',
      unit: 'pt'
    });

    let currentY = 0;
    const currentDate = new Date().toLocaleDateString();
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();

    // 1. Generate Header Banner
    const header = document.createElement('div');
    header.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      height: ${PDF_SPECS.HEADER.HEIGHT}px;
      width: ${PDF_SPECS.PAGE.WIDTH}px;
      background-color: ${PDF_SPECS.COLORS.ONTOP_PINK};
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-sizing: border-box;
      z-index: 1000;
    `;
    
    header.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px; margin-left: ${PDF_SPECS.PAGE.MARGINS.LEFT}px">
        <div style="width: ${PDF_SPECS.HEADER.LOGO_HEIGHT}px; height: ${PDF_SPECS.HEADER.LOGO_HEIGHT}px; background-color: white; border-radius: 4px;"></div>
        <div>
          <h1 style="font-size: 18px; margin: 0; font-weight: bold;">Ontop</h1>
          <p style="font-size: ${PDF_SPECS.HEADER.TEXT_SIZE}px; margin: 0; opacity: 0.9;">
            Global Employment Solutions
          </p>
        </div>
      </div>
      <div style="text-align: right; margin-right: ${PDF_SPECS.PAGE.MARGINS.RIGHT}px; font-size: ${PDF_SPECS.HEADER.TEXT_SIZE}px;">
        <p style="margin: 4px 0;">Quote Sender: ${formData.aeName}</p>
        <p style="margin: 4px 0;">Client Name: ${formData.clientName}</p>
        <p style="margin: 4px 0;">Valid Until: ${validUntil}</p>
      </div>
    `;

    document.body.appendChild(header);

    // Validate and add header
    if (validatePDFElement(header, 'header')) {
      const headerCanvas = await html2canvas(header, {
        scale: 2,
        backgroundColor: PDF_SPECS.COLORS.ONTOP_PINK,
        logging: false
      });
      
      doc.addImage(
        headerCanvas, 
        'PNG', 
        0, 
        currentY, 
        PDF_SPECS.PAGE.WIDTH, 
        PDF_SPECS.HEADER.HEIGHT
      );
      
      currentY += PDF_SPECS.HEADER.HEIGHT + 20;
    }

    document.body.removeChild(header);

    // 2. Format Tables
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

      clone.querySelectorAll('.table-header').forEach(header => {
        (header as HTMLElement).style.cssText = `
          background-color: ${PDF_SPECS.COLORS.ONTOP_PINK};
          color: white;
          padding: ${PDF_SPECS.TABLE.PADDING}px;
          font-size: ${PDF_SPECS.TABLE.FONT_SIZE + 1}px;
          font-weight: 500;
        `;
      });

      return clone;
    };

    // 3. Add Tables with Proper Spacing
    const tables = [
      '.amount-you-pay',
      '.amount-employee-gets',
      '.setup-summary-container'
    ];

    for (const tableSelector of tables) {
      const table = document.querySelector(tableSelector);
      if (!table) continue;

      const formattedTable = formatTable(table as HTMLElement);
      document.body.appendChild(formattedTable);
      
      if (validatePDFElement(formattedTable, 'table')) {
        // Check if need new page
        if (currentY + formattedTable.offsetHeight > PDF_SPECS.PAGE.HEIGHT - PDF_SPECS.PAGE.MARGINS.BOTTOM) {
          doc.addPage();
          currentY = PDF_SPECS.PAGE.MARGINS.TOP;
        }

        const tableCanvas = await html2canvas(formattedTable, {
          scale: 2,
          backgroundColor: null,
          logging: false
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
      }

      document.body.removeChild(formattedTable);
    }

    // 4. Add Footer with Important Notes
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

    // Validate and add footer
    if (validatePDFElement(footer, 'footer')) {
      // Check if need new page for footer
      if (currentY + 200 > PDF_SPECS.PAGE.HEIGHT - PDF_SPECS.PAGE.MARGINS.BOTTOM) {
        doc.addPage();
        currentY = PDF_SPECS.PAGE.MARGINS.TOP;
      }

      const footerCanvas = await html2canvas(footer, {
        scale: 2,
        backgroundColor: PDF_SPECS.COLORS.BLUE_BG,
        logging: false
      });

      doc.addImage(
        footerCanvas,
        'PNG',
        PDF_SPECS.PAGE.MARGINS.LEFT,
        currentY,
        PDF_SPECS.PAGE.WIDTH - (PDF_SPECS.PAGE.MARGINS.LEFT + PDF_SPECS.PAGE.MARGINS.RIGHT),
        footerCanvas.height / 2
      );
    }

    document.body.removeChild(footer);

    return doc;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

// Legacy function for backward compatibility
export const generatePDF = async (element: HTMLElement, data: QuoteData, formData: FormData): Promise<void> => {
  try {
    const doc = await generateQuotePDF(formData);
    const fileName = `Ontop-Quote-${formData.clientName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};
