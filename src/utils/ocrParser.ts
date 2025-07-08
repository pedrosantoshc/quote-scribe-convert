import { ParsedField, QuoteData } from '../components/QuoteGenerator';

// Country to currency mapping
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  "Albania": "ALL", "Arab Emirates": "AED", "Argentina": "ARS", "Australia": "AUD",
  "Austria": "EUR", "Azerbaijan": "AZN", "Bangladesh": "BDT", "Belgium": "EUR",
  "Bolivia": "BOB", "Brazil": "BRL", "Bulgaria": "BGN", "Cambodia": "KHR",
  "Canada": "CAD", "Chile": "CLP", "China": "CNY", "Colombia": "COP",
  "Croatia": "EUR", "Czech Republic": "CZK", "Denmark": "DKK",
  "Dominican Republic": "DOP", "Ecuador": "USD", "Egypt": "EGP",
  "El Salvador": "USD", "Estonia": "EUR", "Finland": "EUR", "France": "EUR",
  "Georgia": "GEL", "Germany": "EUR", "Greece": "EUR", "Guatemala": "GTQ",
  "Honduras": "HNL", "Hong Kong": "HKD", "India": "INR", "Indonesia": "IDR",
  "Ireland": "EUR", "Italy": "EUR", "Jamaica": "JMD", "Japan": "JPY",
  "Kazakhstan": "KZT", "Kenya": "KES", "Latvia": "EUR", "Lithuania": "EUR",
  "Malawi": "MWK", "Malaysia": "MYR", "Malta": "EUR", "Mauritius": "MUR",
  "Mexico": "MXN", "Moldova": "MDL", "Montenegro": "EUR", "Morocco": "MAD",
  "Namibia": "NAD", "Netherlands": "EUR", "Nicaragua": "NIO",
  "North Macedonia": "MKD", "Panama": "PAB", "Paraguay": "PYG",
  "Peru": "PEN", "Philippines": "PHP", "Poland": "PLN", "Portugal": "EUR",
  "Puerto Rico": "USD", "Romania": "RON", "Rwanda": "RWF", "Senegal": "XOF",
  "Singapore": "SGD", "Slovakia": "EUR", "Slovenia": "EUR", "South Africa": "ZAR",
  "South Korea": "KRW", "Spain": "EUR", "Sri Lanka": "LKR", "Sweden": "SEK",
  "Taiwan": "TWD", "Tanzania": "TZS", "Thailand": "THB", "Turkey": "TRY",
  "Uganda": "UGX", "United Kingdom": "GBP", "Uruguay": "UYU", "USA": "USD",
  "Venezuela": "VES", "Zambia": "ZMW", "Zimbabwe": "ZWL"
};

export const getLocalCurrency = (country: string): string => {
  return COUNTRY_CURRENCY_MAP[country] || 'USD';
};

// Utility function for consistent currency conversion
export const convertAmount = (amount: number, sourceCurrency: string, localCurrency: string, rateToLocal: number, rateToUSD: number) => {
  if (sourceCurrency === 'USD') {
    return {
      usdAmount: amount,
      localAmount: amount * rateToLocal
    };
  } else {
    return {
      localAmount: amount,
      usdAmount: amount * rateToUSD
    };
  }
};

// Add new type for converted fields with required properties
export interface ConvertedField {
  label: string;
  amount: number;
  currency: string;
  usdAmount: number;
  localAmount: number;
}

// Helper function to safely convert ParsedField to ConvertedField
export const convertParsedField = (field: ParsedField, defaultUSD = 0, defaultLocal = 0): ConvertedField => {
  return {
    label: field.label,
    amount: field.amount,
    currency: field.currency,
    usdAmount: field.usdAmount ?? defaultUSD,
    localAmount: field.localAmount ?? defaultLocal
  };
};

// Function to check if Severance Pay exists in the data
export const hasSeverancePay = (fields: ParsedField[]): boolean => {
  return fields.some(field => 
    field.label.toLowerCase().includes('severance pay') ||
    field.label.toLowerCase().includes('severance')
  );
};

// Function to process Amount You Pay fields with Severance Pay logic
export const processAmountYouPayFields = (
  parsedFields: ParsedField[], 
  grossSalary: number, 
  eorFeeUSD: number,
  rateToLocal: number,
  rateToUSD: number
): ConvertedField[] => {
  console.log('Processing Amount You Pay fields with Severance Pay logic');
  
  const severancePayExists = hasSeverancePay(parsedFields);
  console.log('Severance Pay detected:', severancePayExists);

  // Convert parsed fields with proper currency conversion
  const convertedFields = parsedFields.map(field => {
    const converted = convertAmount(field.amount, field.currency, getLocalCurrency(''), rateToLocal, rateToUSD);
    return convertParsedField(field, converted.usdAmount, converted.localAmount);
  });

  // Add Dismissal Deposit only if Severance Pay is NOT present
  if (!severancePayExists) {
    console.log('Adding Dismissal Deposit (no Severance Pay found)');
    const dismissalDeposit: ConvertedField = {
      label: 'Dismissal Deposit (1/12 salary)',
      amount: grossSalary / 12,
      currency: 'USD',
      localAmount: (grossSalary / 12) * rateToLocal,
      usdAmount: grossSalary / 12
    };
    convertedFields.push(dismissalDeposit);
  } else {
    console.log('Skipping Dismissal Deposit (Severance Pay found)');
  }

  // Always add EOR Fee
  const eorFee: ConvertedField = {
    label: 'Ontop EOR Fee',
    amount: eorFeeUSD,
    currency: 'USD',
    localAmount: eorFeeUSD * rateToLocal,
    usdAmount: eorFeeUSD
  };
  convertedFields.push(eorFee);

  return convertedFields;
};

const parseLineAmount = (line: string): { label: string; amount: number; currency: string } | null => {
  // Enhanced pattern matching for different line formats
  const amountMatch = line.match(/^(.+?)\s+([A-Z]{3})\s*([\d,.]+)$/i) || 
                     line.match(/^(.+?)\s*([\d,.]+)\s+([A-Z]{3})$/i) ||
                     line.match(/^(.+?):\s*([A-Z]{3})\s*([\d,.]+)$/i);
  
  if (amountMatch) {
    let label, amount, currency;
    
    if (amountMatch.length === 4 && amountMatch[3]) {
      if (amountMatch[1].includes(':')) {
        // Pattern: "Label: USD 123.45"
        label = amountMatch[1].replace(':', '').trim();
        currency = amountMatch[2];
        amount = parseFloat(amountMatch[3].replace(/,/g, ''));
      } else if (isNaN(parseFloat(amountMatch[2]))) {
        // Pattern: "Label USD 123.45"
        label = amountMatch[1].trim();
        currency = amountMatch[2];
        amount = parseFloat(amountMatch[3].replace(/,/g, ''));
      } else {
        // Pattern: "Label 123.45 USD"
        label = amountMatch[1].trim();
        amount = parseFloat(amountMatch[2].replace(/,/g, ''));
        currency = amountMatch[3];
      }
    }

    // Normalize currency to uppercase
    currency = currency.toUpperCase();

    if (label && !isNaN(amount) && amount > 0) {
      return { label, amount, currency };
    }
  }
  
  return null;
};

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
  const gmsData = parseLineAmount(gmsLine);
  if (gmsData) {
    currency = gmsData.currency;
    grossSalary = gmsData.amount;
    
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

    const lineData = parseLineAmount(line);
    if (lineData) {
      payFields.push({
        label: lineData.label,
        amount: lineData.amount,
        currency: lineData.currency
      });
      console.log('Parsed Pay field:', lineData);
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

    const lineData = parseLineAmount(line);
    if (lineData) {
      employeeFields.push({
        label: lineData.label,
        amount: lineData.amount,
        currency: lineData.currency
      });
      console.log('Parsed Employee field:', lineData);
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
