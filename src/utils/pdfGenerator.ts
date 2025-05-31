
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { QuoteData, FormData } from '../components/QuoteGenerator';

export const generatePDF = async (element: HTMLElement, data: QuoteData, formData: FormData): Promise<void> => {
  try {
    // Helper to measure sections
    const measureSection = async (selector: string) => {
      const section = element.querySelector(selector) as HTMLElement;
      if (!section) return null;
      
      const canvas = await html2canvas(section, { 
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      return {
        element: section,
        height: canvas.height,
        canvas,
        selector
      };
    };

    console.log('Starting PDF generation...');

    // Get measurements for all sections
    const sections = await Promise.all([
      measureSection('.header'),
      measureSection('.amount-you-pay'),
      measureSection('.amount-employee-gets'),
      measureSection('.setup-summary-container')
    ]);

    // Filter out null sections
    const validSections = sections.filter(section => section !== null);

    if (validSections.length === 0) {
      throw new Error('No valid sections found for PDF generation');
    }

    // Constants for layout
    const A4_HEIGHT = 842;
    const A4_WIDTH = 595;
    const MARGIN = 50;
    const SPACING = 20;
    const USABLE_HEIGHT = A4_HEIGHT - (2 * MARGIN);
    const USABLE_WIDTH = A4_WIDTH - (2 * MARGIN);

    // Group sections into pages
    const pages: any[][] = [[]];
    let currentPageHeight = 0;

    validSections.forEach(section => {
      // Calculate scaled height
      const scale = USABLE_WIDTH / section.canvas.width;
      const scaledHeight = (section.canvas.height * scale) + SPACING;
      
      // Start new page if current section won't fit
      if (currentPageHeight + scaledHeight > USABLE_HEIGHT && 
          // Don't start new page if this is first section
          pages[pages.length - 1].length > 0) {
        pages.push([]);
        currentPageHeight = 0;
      }
      
      pages[pages.length - 1].push(section);
      currentPageHeight += scaledHeight;
    });

    console.log(`Generating PDF with ${pages.length} pages...`);

    // Generate PDF
    const pdf = new jsPDF({
      unit: 'pt',
      format: 'a4',
      orientation: 'portrait'
    });

    pages.forEach((pageSections, pageIndex) => {
      if (pageIndex > 0) {
        pdf.addPage();
      }
      
      let yOffset = MARGIN;
      
      pageSections.forEach(section => {
        // Calculate scale to fit width while maintaining aspect ratio
        const scale = USABLE_WIDTH / section.canvas.width;
        const scaledWidth = section.canvas.width * scale;
        const scaledHeight = section.canvas.height * scale;
        
        console.log(`Adding section ${section.selector} to page ${pageIndex + 1}`);
        
        pdf.addImage(
          section.canvas.toDataURL('image/png'),
          'PNG',
          MARGIN,
          yOffset,
          scaledWidth,
          scaledHeight
        );
        
        yOffset += scaledHeight + SPACING;
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
