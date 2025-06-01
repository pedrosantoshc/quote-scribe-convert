
import React from 'react';
import { QuoteData, FormData } from './QuoteGenerator';
import { QuoteFooter } from './QuoteFooter';

interface QuoteLayoutProps {
  data: QuoteData;
  formData: FormData;
  children: React.ReactNode;
}

const QuoteLayout: React.FC<QuoteLayoutProps> = ({ data, formData, children }) => {
  const currentDate = new Date().toLocaleDateString();

  return (
    <div className="quote-container space-y-8">
      {/* Quote Header */}
      <div className="quote-header mb-12">
        <div className="py-20 px-8 border-b border-[#FF5A71] bg-white">
          <div className="flex justify-between items-start max-w-7xl mx-auto">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#FF5A71] rounded"></div>
                <h1 className="text-[#FF5A71] text-3xl font-bold">Ontop</h1>
              </div>
              <p className="text-gray-600 mt-2">Global Employment Solutions</p>
            </div>
            <div className="flex-1 text-right space-y-3">
              <div className="flex justify-end gap-2">
                <span className="text-gray-600">Quote Sender:</span>
                <span className="font-medium">{formData.aeName}</span>
              </div>
              <div className="flex justify-end gap-2">
                <span className="text-gray-600">Client Name:</span>
                <span className="font-medium">{formData.clientName}</span>
              </div>
              <div className="flex justify-end gap-2">
                <span className="text-gray-600">Valid Until:</span>
                <span className="font-medium">{new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
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
