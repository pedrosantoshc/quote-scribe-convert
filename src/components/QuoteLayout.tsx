
import React from 'react';
import { QuoteData, FormData } from './QuoteGenerator';
import QuoteFooter from './QuoteFooter';

interface QuoteLayoutProps {
  data: QuoteData;
  formData: FormData;
  children: React.ReactNode;
}

const QuoteLayout: React.FC<QuoteLayoutProps> = ({ data, formData, children }) => {
  const currentDate = new Date().toLocaleDateString();

  return (
    <div className="quote-container space-y-8">
      {children}
      
      <QuoteFooter 
        exchangeRate={data.exchangeRate}
        localCurrency={data.localCurrency}
        currentDate={currentDate}
      />
    </div>
  );
};

export default QuoteLayout;
