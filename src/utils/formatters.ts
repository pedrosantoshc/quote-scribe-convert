
export const formatNumber = (value: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

export const formatAmount = (value: number): string => formatNumber(value, 2);

export const formatExchangeRate = (value: number): string => formatNumber(value, 5);
