import { ParsedField, QuoteData } from '../components/QuoteGenerator';

export const parseOCRText = (text: string): Omit<QuoteData, 'exchangeRate'> => {
  console.log('Parsing OCR text:', text);

  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const amountYouPay: ParsedField[] = [];
  const amountEmployeeGets: ParsedField[] = [];
  const setupSummary: ParsedField[] = [];

  let currentSection = '';
  let detectedCurrency = 'USD';
  let alternateCurrency = 'EUR';

  // Currency detection patterns
  const currencyPattern = /\b(USD|EUR|GBP|CLP|ARS|BRL|MXN|COP|PEN|BDT|INR|SGD|AUD|CAD|CHF|JPY|CNY)\b/gi;
  const amountPattern = /[\d,.\s]+\s*(USD|EUR|GBP|CLP|ARS|BRL|MXN|COP|PEN|BDT|INR|SGD|AUD|CAD|CHF|JPY|CNY)/gi;

  // First pass: detect currencies
  const allCurrencies = new Set<string>();
  text.match(currencyPattern)?.forEach(curr => allCurrencies.add(curr.toUpperCase()));
  
  const currencyArray = Array.from(allCurrencies);
  if (currencyArray.length > 0) {
    detectedCurrency = currencyArray[0];
    alternateCurrency = currencyArray.includes('USD') && detectedCurrency !== 'USD' ? 'USD' : 'EUR';
  }

  console.log('Detected currencies:', currencyArray, 'Main:', detectedCurrency, 'Alt:', alternateCurrency);

  // Section headers detection
  const sectionPatterns = {
    youPay: /amount\s+you\s+pay|employer\s+cost|total\s+cost/i,
    employeeGets: /amount\s+employee\s+gets|employee\s+receives|net\s+salary/i,
    setup: /setup|security\s+deposit|ontop\s+fee|initial\s+cost/i
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';

    // Detect section headers
    if (sectionPatterns.youPay.test(line)) {
      currentSection = 'youPay';
      console.log('Found "Amount You Pay" section at line:', line);
      continue;
    }
    if (sectionPatterns.employeeGets.test(line)) {
      currentSection = 'employeeGets';
      console.log('Found "Amount Employee Gets" section at line:', line);
      continue;
    }
    if (sectionPatterns.setup.test(line)) {
      currentSection = 'setup';
      console.log('Found "Setup" section at line:', line);
      continue;
    }

    // Parse monetary amounts
    const parseAmount = (text: string): { amount: number; currency: string } | null => {
      const matches = text.match(amountPattern);
      if (!matches) return null;

      for (const match of matches) {
        const currMatch = match.match(currencyPattern);
        if (!currMatch) continue;

        const currency = currMatch[0].toUpperCase();
        const numberStr = match.replace(currencyPattern, '').trim();
        
        // Clean number: remove thousand separators but keep decimal points
        const cleanNumber = numberStr.replace(/,(?=\d{3})/g, '').replace(/\.(?=\d{3})/g, '');
        const amount = parseFloat(cleanNumber);

        if (!isNaN(amount) && amount > 0) {
          return { amount, currency };
        }
      }
      return null;
    };

    // Try current line first, then next line if current doesn't have amount
    let amountData = parseAmount(line);
    let label = line;

    // Case B: Label on one line, amount on next line
    if (!amountData && nextLine) {
      amountData = parseAmount(nextLine);
      if (amountData) {
        label = line;
        i++; // Skip the next line since we used it
      }
    }

    // Case A: Label and amount on same line
    if (amountData) {
      // Extract label by removing the amount part
      const cleanLabel = label.replace(amountPattern, '').trim();
      
      if (cleanLabel) {
        const field: ParsedField = {
          label: cleanLabel,
          amount: amountData.amount,
          currency: amountData.currency
        };

        switch (currentSection) {
          case 'youPay':
            amountYouPay.push(field);
            break;
          case 'employeeGets':
            amountEmployeeGets.push(field);
            break;
          case 'setup':
            setupSummary.push(field);
            break;
          default:
            // If no section detected yet, try to categorize by keywords
            const lowerLabel = cleanLabel.toLowerCase();
            if (lowerLabel.includes('gross') || lowerLabel.includes('employer') || lowerLabel.includes('contribution')) {
              amountYouPay.push(field);
            } else if (lowerLabel.includes('net') || lowerLabel.includes('employee') || lowerLabel.includes('take home')) {
              amountEmployeeGets.push(field);
            } else if (lowerLabel.includes('setup') || lowerLabel.includes('deposit') || lowerLabel.includes('fee')) {
              setupSummary.push(field);
            }
        }

        console.log('Parsed field:', field, 'in section:', currentSection);
      }
    }
  }

  // Add calculated fields if we have a gross salary
  const grossSalaryField = amountYouPay.find(f => 
    f.label.toLowerCase().includes('gross') || f.label.toLowerCase().includes('salary')
  );

  if (grossSalaryField && setupSummary.length === 0) {
    setupSummary.push({
      label: 'Security Deposit (1/12 salary)',
      amount: Math.round(grossSalaryField.amount / 12 * 100) / 100,
      currency: grossSalaryField.currency
    });
    setupSummary.push({
      label: 'Ontop EOR Fee',
      amount: Math.round(grossSalaryField.amount * 0.05 * 100) / 100, // 5% default
      currency: grossSalaryField.currency
    });
  }

  const result = {
    amountYouPay,
    amountEmployeeGets,
    setupSummary,
    localCurrency: detectedCurrency,
    alternateCurrency
  };

  console.log('Final parsed result:', result);
  return result;
};
