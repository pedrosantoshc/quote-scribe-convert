import { ParsedField, QuoteData } from '../components/QuoteGenerator';

export const parsePayScreenshot = (text: string): { payFields: ParsedField[]; grossSalary: number; currency: string } => {
  console.log('Parsing Pay screenshot OCR text:', text);

  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  
  const payFields: ParsedField[] = [];
  let grossSalary = 0;
  let currency = 'USD';

  // Find Gross Monthly Salary first
  const gmsLine = lines.find(line => /gross\s+monthly\s+salary/i.test(line));
  if (!gmsLine) {
    throw new Error("Could not find Gross Monthly Salary in the Amount You Pay screenshot. Please ensure the screenshot contains a clear 'Gross Monthly Salary' field.");
  }

  // Extract Gross Monthly Salary amount and currency
  const gmsMatch = gmsLine.match(/([A-Z]{3})\s*([\d,.]+)/i);
  if (gmsMatch) {
    currency = gmsMatch[1];
    grossSalary = parseFloat(gmsMatch[2].replace(/,/g, ''));
    
    payFields.push({
      label: 'Gross Monthly Salary',
      amount: grossSalary,
      currency: currency
    });
  }

  // Parse all other lines that contain currency and amount
  lines.forEach(line => {
    // Skip the gross salary line since we already processed it
    if (/gross\s+monthly\s+salary/i.test(line)) return;
    
    // Skip header lines
    if (line.toLowerCase().includes('country') || 
        line.toLowerCase().includes('amount you pay') ||
        line.toLowerCase().includes('amount employee gets')) {
      return;
    }

    // Look for pattern: "Label USD 123.45" or "Label 123.45 USD"
    const amountMatch = line.match(/^(.+?)\s+([A-Z]{3})\s*([\d,.]+)$/i) || 
                       line.match(/^(.+?)\s*([\d,.]+)\s+([A-Z]{3})$/i);
    
    if (amountMatch) {
      let label, amount, lineCurrency;
      
      if (amountMatch[3]) {
        // Pattern: "Label 123.45 USD"
        label = amountMatch[1].trim();
        amount = parseFloat(amountMatch[2].replace(/,/g, ''));
        lineCurrency = amountMatch[3];
      } else {
        // Pattern: "Label USD 123.45"
        label = amountMatch[1].trim();
        lineCurrency = amountMatch[2];
        amount = parseFloat(amountMatch[3].replace(/,/g, ''));
      }

      if (label && !isNaN(amount) && amount > 0) {
        payFields.push({
          label: label,
          amount: amount,
          currency: lineCurrency
        });
        console.log('Parsed Pay field:', { label, amount, currency: lineCurrency });
      }
    }
  });

  return { payFields, grossSalary, currency };
};

export const parseEmployeeScreenshot = (text: string): { employeeFields: ParsedField[] } => {
  console.log('Parsing Employee screenshot OCR text:', text);

  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  
  const employeeFields: ParsedField[] = [];

  // Parse all lines that contain currency and amount
  lines.forEach(line => {
    // Skip header lines
    if (line.toLowerCase().includes('country') || 
        line.toLowerCase().includes('amount you pay') ||
        line.toLowerCase().includes('amount employee gets')) {
      return;
    }

    // Look for pattern: "Label USD 123.45" or "Label 123.45 USD"
    const amountMatch = line.match(/^(.+?)\s+([A-Z]{3})\s*([\d,.]+)$/i) || 
                       line.match(/^(.+?)\s*([\d,.]+)\s+([A-Z]{3})$/i);
    
    if (amountMatch) {
      let label, amount, currency;
      
      if (amountMatch[3]) {
        // Pattern: "Label 123.45 USD"
        label = amountMatch[1].trim();
        amount = parseFloat(amountMatch[2].replace(/,/g, ''));
        currency = amountMatch[3];
      } else {
        // Pattern: "Label USD 123.45"
        label = amountMatch[1].trim();
        currency = amountMatch[2];
        amount = parseFloat(amountMatch[3].replace(/,/g, ''));
      }

      if (label && !isNaN(amount) && amount > 0) {
        employeeFields.push({
          label: label,
          amount: amount,
          currency: currency
        });
        console.log('Parsed Employee field:', { label, amount, currency });
      }
    }
  });

  return { employeeFields };
};

// Keep the old function for backward compatibility but mark as deprecated
export const parseOCRText = (text: string): { amountYouPay: ParsedField[]; amountEmployeeGets: ParsedField[]; localCurrency: string } => {
  console.warn('parseOCRText is deprecated, use parsePayScreenshot and parseEmployeeScreenshot instead');
  
  // Fallback implementation
  return {
    amountYouPay: [],
    amountEmployeeGets: [],
    localCurrency: 'USD'
  };
};
