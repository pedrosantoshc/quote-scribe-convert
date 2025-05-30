
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { QuoteData, FormData } from '../components/QuoteGenerator';

export const generatePDF = async (element: HTMLElement, data: QuoteData, formData: FormData): Promise<void> => {
  try {
    // Create a temporary container for PDF content
    const pdfContainer = document.createElement('div');
    pdfContainer.style.width = '210mm'; // A4 width
    pdfContainer.style.minHeight = '297mm'; // A4 height
    pdfContainer.style.padding = '20mm';
    pdfContainer.style.backgroundColor = 'white';
    pdfContainer.style.fontFamily = 'Arial, sans-serif';
    pdfContainer.style.position = 'absolute';
    pdfContainer.style.top = '-9999px';
    pdfContainer.style.left = '-9999px';

    // Apply PDF-specific styles
    const pdfStyles = `
      .pdf-container {
        font-family: 'Arial', sans-serif;
        color: #333;
        line-height: 1.4;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 40px;
        padding-bottom: 20px;
        border-bottom: 2px solid #FF5A71;
      }
      .logo {
        font-size: 32px;
        color: #FF5A71;
        font-weight: bold;
      }
      .logo-subtitle {
        font-size: 14px;
        color: #666;
        margin-top: 5px;
      }
      .quote-info {
        text-align: right;
        background: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
        border-left: 4px solid #FF5A71;
      }
      .quote-info div {
        margin-bottom: 8px;
        font-size: 14px;
      }
      .table-container {
        break-inside: avoid;
        margin-bottom: 30px;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      }
      .table-header {
        padding: 15px;
        color: white;
        font-size: 18px;
        font-weight: bold;
      }
      .amount-you-pay .table-header {
        background: #FF5A71;
      }
      .amount-employee-gets .table-header {
        background: #10B981;
      }
      .setup-summary .table-header {
        background: #3B82F6;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        background: white;
      }
      th, td {
        padding: 12px 15px;
        text-align: left;
        border-bottom: 1px solid #e5e7eb;
      }
      th {
        background: #f9fafb;
        font-size: 12px;
        color: #374151;
        font-weight: 600;
      }
      td {
        font-size: 14px;
        color: #111827;
      }
      .currency-column {
        text-align: right;
        font-weight: 500;
      }
      .subtotal-row {
        background: #f9fafb;
        font-weight: 600;
      }
      .total-row {
        background: #f9fafb;
        font-weight: 600;
        border-top: 2px solid #e5e7eb;
      }
      .footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
        font-size: 11px;
        color: #666;
        line-height: 1.4;
      }
      .footer ul {
        margin: 10px 0;
        padding-left: 20px;
      }
      .footer li {
        margin-bottom: 5px;
      }
      .footer-center {
        text-align: center;
        margin-top: 20px;
        color: #FF5A71;
        font-weight: bold;
      }
    `;

    // Create PDF header
    const header = document.createElement('div');
    header.innerHTML = `
      <div class="header">
        <div>
          <div class="logo">Ontop</div>
          <div class="logo-subtitle">Global Employment Solutions</div>
        </div>
        <div class="quote-info">
          <div><strong>Quote Sender:</strong> ${formData.aeName}</div>
          <div><strong>Client Name:</strong> ${formData.clientName}</div>
          <div><strong>Valid Until:</strong> ${new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}</div>
        </div>
      </div>
    `;

    // Create PDF content with improved table formatting
    const content = document.createElement('div');
    content.innerHTML = `
      <h2 style="color: #333; font-size: 24px; margin-bottom: 20px;">Employment Quote Summary</h2>
      
      <div style="display: block;">
        ${createTableHTML('Amount You Pay', data.payFields, 'amount-you-pay', true)}
        ${createTableHTML('Amount Employee Gets', data.employeeFields, 'amount-employee-gets', false)}
        ${data.setupSummary.length > 0 ? createTableHTML('Setup Summary', data.setupSummary, 'setup-summary', true) : ''}
      </div>
    `;

    // Create footer
    const footer = document.createElement('div');
    const currentDate = new Date().toLocaleDateString();
    footer.innerHTML = `
      <div class="footer">
        <p><strong>Important Notes:</strong></p>
        <ul>
          <li>Currency conversions based on rates on ${currentDate}, may vary—contracts always in local currency.</li>
          <li>Setup Cost = one month's salary (Security Deposit) + Ontop fee; secures Ontop against potential defaults.</li>
          <li>Dismissal Deposit = one-twelfth of salary, provisioned for future termination costs.</li>
        </ul>
        <div class="footer-center">
          Generated by Ontop Quote Generator • ${currentDate}
        </div>
      </div>
    `;

    // Assemble PDF container
    pdfContainer.className = 'pdf-container';
    pdfContainer.appendChild(header);
    pdfContainer.appendChild(content);
    pdfContainer.appendChild(footer);

    // Add styles to head
    const styleElement = document.createElement('style');
    styleElement.textContent = pdfStyles;
    document.head.appendChild(styleElement);

    document.body.appendChild(pdfContainer);

    // Generate PDF
    const canvas = await html2canvas(pdfContainer, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    document.body.removeChild(pdfContainer);
    document.head.removeChild(styleElement);

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const fileName = `Ontop-Quote-${formData.clientName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

const createTableHTML = (title: string, fields: any[], containerClass: string, showTotal: boolean = true): string => {
  if (fields.length === 0) return '';

  const total = fields.reduce((sum, field) => sum + field.amount, 0);
  
  const formatNumber = (amount: number): string => amount.toFixed(2);
  
  return `
    <div class="table-container ${containerClass}">
      <div class="table-header">${title}</div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="currency-column">Local Amount</th>
            <th class="currency-column">USD Amount</th>
          </tr>
        </thead>
        <tbody>
          ${fields.map(field => `
            <tr>
              <td>${field.label}</td>
              <td class="currency-column">
                ${formatNumber(field.localAmount || field.amount)} ${field.currency}
              </td>
              <td class="currency-column">
                ${formatNumber(field.usdAmount || (field.amount))} USD
              </td>
            </tr>
          `).join('')}
          ${showTotal ? `
          <tr class="total-row">
            <td><strong>Total</strong></td>
            <td class="currency-column">
              <strong>${formatNumber(total)} ${fields[0]?.currency || 'USD'}</strong>
            </td>
            <td class="currency-column">
              <strong>${formatNumber(total)} USD</strong>
            </td>
          </tr>
          ` : ''}
        </tbody>
      </table>
    </div>
  `;
};
