
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { QuoteData, FormData } from '../components/QuoteGenerator';

export const generatePDF = async (element: HTMLElement, data: QuoteData, formData: FormData): Promise<void> => {
  try {
    // Constants for layout
    const PAGE = {
      WIDTH: 595.28,
      HEIGHT: 841.89,
      MARGIN: 50,
      SPACING: 20
    };

    // Helper to capture styled content
    const captureStyledSection = async (selector: string, options: {
      preserveBackground?: boolean;
      padding?: number;
      extraStyles?: Record<string, string>;
    } = {}) => {
      const section = element.querySelector(selector) as HTMLElement;
      if (!section) return null;

      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.width = 'auto';
      
      const clone = section.cloneNode(true) as HTMLElement;
      
      // Apply styles
      if (options.preserveBackground) {
        container.style.backgroundColor = window.getComputedStyle(section).backgroundColor;
      }
      if (options.padding) {
        container.style.padding = `${options.padding}px`;
      }
      if (options.extraStyles) {
        Object.assign(container.style, options.extraStyles);
      }
      
      container.appendChild(clone);
      document.body.appendChild(container);
      
      // Wait for styles to be applied
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: null
      });
      
      document.body.removeChild(container);
      
      return {
        element: section,
        height: canvas.height,
        canvas,
        selector
      };
    };

    console.log('Starting PDF generation...');

    // Capture sections with proper styling
    const sections = await Promise.all([
      captureStyledSection('.header', { padding: 40 }),
      captureStyledSection('.amount-you-pay', { padding: 20 }),
      captureStyledSection('.amount-employee-gets', { padding: 20 }),
      captureStyledSection('.setup-summary-container', { padding: 20 }),
      captureStyledSection('.quote-footer', { 
        preserveBackground: true,
        padding: 24,
        extraStyles: {
          borderRadius: '8px',
          marginTop: '32px'
        }
      })
    ]);

    // Filter out null sections
    const validSections = sections.filter(section => section !== null);

    if (validSections.length === 0) {
      throw new Error('No valid sections found for PDF generation');
    }

    // Group sections into pages
    const USABLE_HEIGHT = PAGE.HEIGHT - (2 * PAGE.MARGIN);
    const pages: any[][] = [[]];
    let currentPageHeight = 0;

    validSections.forEach((section) => {
      const sectionHeight = section.height + PAGE.SPACING;

      // Start new page if needed
      if (currentPageHeight + sectionHeight > USABLE_HEIGHT && pages[pages.length - 1].length > 0) {
        pages.push([]);
        currentPageHeight = 0;
      }

      pages[pages.length - 1].push(section);
      currentPageHeight += sectionHeight;
    });

    console.log(`Generating PDF with ${pages.length} pages...`);

    // Generate PDF with proper spacing
    const pdf = new jsPDF({
      unit: 'pt',
      format: 'a4',
      orientation: 'portrait'
    });

    pages.forEach((pageSections, pageIndex) => {
      if (pageIndex > 0) {
        pdf.addPage();
      }

      let yOffset = PAGE.MARGIN;
      
      pageSections.forEach((section) => {
        // Calculate scale to fit width while maintaining aspect ratio
        const scale = (PAGE.WIDTH - (2 * PAGE.MARGIN)) / section.canvas.width;
        const scaledWidth = section.canvas.width * scale;
        const scaledHeight = section.canvas.height * scale;

        // Center horizontally
        const xOffset = PAGE.MARGIN + ((PAGE.WIDTH - (2 * PAGE.MARGIN) - scaledWidth) / 2);
        
        console.log(`Adding section ${section.selector} to page ${pageIndex + 1}`);
        
        pdf.addImage(
          section.canvas.toDataURL('image/png'),
          'PNG',
          xOffset,
          yOffset,
          scaledWidth,
          scaledHeight
        );

        yOffset += scaledHeight + PAGE.SPACING;
      });
    });

    // Save the PDF
    const fileName = `Ontop-Quote-${formData.clientName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    console.log('Saving PDF:', fileName);
    pdf.save(fileName);

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};
