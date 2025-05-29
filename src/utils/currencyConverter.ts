
export interface CurrencyRates {
  base: string;
  date: string;
  rates: Record<string, number>;
}

const FALLBACK_RATES: CurrencyRates = {
  base: 'USD',
  date: '2024-01-01',
  rates: {
    USD: 1,
    EUR: 0.85,
    GBP: 0.73,
    CLP: 800,
    ARS: 350,
    BRL: 5.2,
    MXN: 18.5,
    COP: 4200,
    PEN: 3.8,
    BDT: 110,
    INR: 83,
    SGD: 1.35,
    AUD: 1.55,
    CAD: 1.38,
    CHF: 0.92,
    JPY: 150,
    CNY: 7.2
  }
};

export const convertCurrency = async (): Promise<CurrencyRates> => {
  try {
    console.log('Fetching live exchange rates...');
    
    // Using open.er-api.com which is free and doesn't require API key
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.result === 'success') {
      console.log('Live exchange rates fetched successfully');
      return {
        base: data.base_code,
        date: data.time_last_update_utc,
        rates: data.rates
      };
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    console.warn('Failed to fetch live rates, using fallback:', error);
    
    // Show toast notification about fallback rates
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      const toastEvent = new CustomEvent('show-toast', {
        detail: {
          variant: 'destructive',
          title: 'Exchange Rates',
          description: 'Live exchange rates unavailable, using fallback rates.'
        }
      });
      window.dispatchEvent(toastEvent);
    }
    
    return FALLBACK_RATES;
  }
};

export const convertAmount = (amount: number, fromCurrency: string, toCurrency: string, rates: CurrencyRates): number => {
  if (fromCurrency === toCurrency) return amount;
  
  // Convert to USD first if needed
  const usdAmount = fromCurrency === 'USD' ? amount : amount / (rates.rates[fromCurrency] || 1);
  
  // Convert from USD to target currency
  const targetRate = rates.rates[toCurrency] || 1;
  const convertedAmount = usdAmount * targetRate;
  
  return Math.round(convertedAmount * 100) / 100;
};
