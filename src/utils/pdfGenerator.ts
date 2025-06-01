
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

    // Improved section capture with explicit styling preservation
    const captureSection = async (selector: string, options: {
      padding?: number;
      preserveBackground?: boolean;
      extraStyles?: Record<string, string>;
    } = {}) => {
      const section = element.querySelector(selector) as HTMLElement;
      if (!section) {
        console.warn(`Section not found: ${selector}`);
        return null;
      }

      // Create a temporary container with fixed width
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.width = `${PAGE.WIDTH - (2 * PAGE.MARGIN)}px`;
      container.style.boxSizing = 'border-box';
      
      // Clone the section with all its content
      const clone = section.cloneNode(true) as HTMLElement;
      const computed = window.getComputedStyle(section);
      
      // Apply computed styles to preserve appearance
      Object.assign(clone.style, {
        backgroundColor: computed.backgroundColor,
        borderRadius: computed.borderRadius,
        padding: options.padding ? `${options.padding}px` : computed.padding,
        margin: '0',
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        lineHeight: computed.lineHeight,
        color: computed.color
      });

      // Apply extra styles if provided
      if (options.extraStyles) {
        Object.assign(clone.style, options.extraStyles);
      }

      container.appendChild(clone);
      document.body.appendChild(container);

      // Wait for styles and layout to be applied
      await new Promise(resolve => setTimeout(resolve, 200));

      // Capture with high resolution
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
        width: container.offsetWidth,
        height: container.offsetHeight
      });

      document.body.removeChild(container);
      
      console.log(`Captured section ${selector}: ${canvas.width}x${canvas.height}`);
      
      return {
        canvas,
        selector,
        height: canvas.height
      };
    };

    console.log('Starting PDF generation...');

    // Capture all sections in order
    const sections = await Promise.all([
      captureSection('.quote-header', { padding: 40 }),
      captureSection('.amount-you-pay', { padding: 20 }),
      captureSection('.amount-employee-gets', { padding: 20 }),
      captureSection('.setup-summary-container', { padding: 20 }),
      captureSection('.quote-footer', { 
        padding: 24,
        preserveBackground: true,
        extraStyles: {
          borderRadius: '8px',
          backgroundColor: 'rgb(239, 246, 255)', // bg-blue-50
          border: '1px solid rgb(219, 234, 254)' // border-blue-200
        }
      })
    ]);

    // Filter out null sections
    const validSections = sections.filter(section => section !== null);

    if (validSections.length === 0) {
      throw new Error('No valid sections found for PDF generation');
    }

    console.log(`Found ${validSections.length} valid sections`);

    // Calculate page layout
    const USABLE_HEIGHT = PAGE.HEIGHT - (2 * PAGE.MARGIN);
    const pages: any[][] = [[]];
    let currentPageHeight = 0;

    validSections.forEach((section) => {
      const scale = (PAGE.WIDTH - (2 * PAGE.MARGIN)) / section.canvas.width;
      const scaledHeight = section.canvas.height * scale;
      const sectionHeight = scaledHeight + PAGE.SPACING;

      // Check if we need a new page
      if (currentPageHeight + sectionHeight > USABLE_HEIGHT && pages[pages.length - 1].length > 0) {
        pages.push([]);
        currentPageHeight = 0;
      }

      pages[pages.length - 1].push(section);
      currentPageHeight += sectionHeight;
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

      let yOffset = PAGE.MARGIN;
      
      pageSections.forEach((section) => {
        // Calculate scale to fit width while maintaining aspect ratio
        const scale = (PAGE.WIDTH - (2 * PAGE.MARGIN)) / section.canvas.width;
        const scaledWidth = section.canvas.width * scale;
        const scaledHeight = section.canvas.height * scale;

        // Center horizontally
        const xOffset = PAGE.MARGIN + ((PAGE.WIDTH - (2 * PAGE.MARGIN) - scaledWidth) / 2);
        
        console.log(`Adding section ${section.selector} to page ${pageIndex + 1} at position (${xOffset}, ${yOffset})`);
        
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
