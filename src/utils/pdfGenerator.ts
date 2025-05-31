
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

    const MIN_HEIGHTS = {
      header: 100,
      notes: 200
    };

    // Helper to measure with proper padding
    const measureSection = async (
      selector: string,
      options: { padding?: number; minHeight?: number } = {}
    ) => {
      const section = element.querySelector(selector) as HTMLElement;
      if (!section) return null;

      // Create a measurement container
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.padding = `${options.padding || 20}px`;
      
      // Clone with styles
      const clone = section.cloneNode(true) as HTMLElement;
      container.appendChild(clone);
      document.body.appendChild(container);

      // Ensure minimum height
      if (options.minHeight) {
        container.style.minHeight = `${options.minHeight}px`;
      }

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: null // Preserve transparency
      });

      document.body.removeChild(container);
      
      return {
        element: section,
        height: Math.max(canvas.height, options.minHeight || 0),
        canvas,
        type: selector.replace('.', ''),
        selector
      };
    };

    console.log('Starting PDF generation...');

    // Measure all sections
    const sections = await Promise.all([
      measureSection('.header', { padding: 40, minHeight: MIN_HEIGHTS.header }),
      measureSection('.amount-you-pay', { padding: 20 }),
      measureSection('.amount-employee-gets', { padding: 20 }),
      measureSection('.setup-summary-container', { padding: 20 }),
      measureSection('.important-notes', { padding: 30, minHeight: MIN_HEIGHTS.notes })
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
