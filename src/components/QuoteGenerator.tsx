
import React, { useState, useRef } from 'react';
import { Upload, Download, RefreshCw, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import ImageUpload from './ImageUpload';
import QuoteTables from './QuoteTables';
import ManualEntry from './ManualEntry';
import { generatePDF } from '../utils/pdfGenerator';
import { parseOCRText } from '../utils/ocrParser';
import { convertCurrency, CurrencyRates } from '../utils/currencyConverter';

export interface ParsedField {
  label: string;
  amount: number;
  currency: string;
}

export interface QuoteData {
  amountYouPay: ParsedField[];
  amountEmployeeGets: ParsedField[];
  setupSummary: ParsedField[];
  localCurrency: string;
  alternateCurrency: string;
  exchangeRate: number;
}

const QuoteGenerator = () => {
  const [ocrText, setOcrText] = useState<string>('');
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currencyRates, setCurrencyRates] = useState<CurrencyRates | null>(null);
  const quoteRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleOCRComplete = async (extractedText: string) => {
    setOcrText(extractedText);
    setIsProcessing(true);

    try {
      console.log('OCR Text extracted:', extractedText);
      
      // Parse the OCR text into structured data
      const parsedData = parseOCRText(extractedText);
      console.log('Parsed data:', parsedData);

      if (!parsedData.amountYouPay.length && !parsedData.amountEmployeeGets.length) {
        toast({
          variant: "destructive",
          title: "Parsing Failed",
          description: "Could not detect required tables. Please try manual entry or re-upload with better image quality.",
        });
        setShowManualEntry(true);
        return;
      }

      // Get currency conversion rates
      const rates = await convertCurrency();
      setCurrencyRates(rates);

      // Set the parsed data
      setQuoteData({
        ...parsedData,
        exchangeRate: rates.rates[parsedData.alternateCurrency] || 1
      });

      toast({
        title: "Success!",
        description: "Quote data extracted successfully from screenshot.",
      });
    } catch (error) {
      console.error('Error processing OCR:', error);
      toast({
        variant: "destructive",
        title: "Processing Error",
        description: "Failed to process the image. Please try again or use manual entry.",
      });
      setShowManualEntry(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualData = (data: QuoteData) => {
    setQuoteData(data);
    setShowManualEntry(false);
  };

  const handleDownloadPDF = async () => {
    if (!quoteData || !quoteRef.current) return;

    try {
      await generatePDF(quoteRef.current, quoteData);
      toast({
        title: "PDF Generated",
        description: "Your quote has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        variant: "destructive",
        title: "PDF Generation Failed",
        description: "There was an error generating the PDF. Please try again.",
      });
    }
  };

  const resetForm = () => {
    setOcrText('');
    setQuoteData(null);
    setShowManualEntry(false);
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Ontop Quote Generator</h1>
            <p className="text-gray-600">Upload a screenshot of Multiplier tables to generate professional quotes</p>
          </div>
          <div className="flex gap-3">
            {quoteData && (
              <Button
                onClick={handleDownloadPDF}
                className="bg-[#FF5A71] hover:bg-[#FF4461] text-white rounded-full px-6 py-3 shadow-lg transition-all duration-200 hover:shadow-xl"
              >
                <Download className="w-5 h-5 mr-2" />
                Download PDF
              </Button>
            )}
            <Button
              onClick={resetForm}
              variant="outline"
              className="rounded-full px-6 py-3"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        {/* Main Content */}
        {!quoteData && !showManualEntry ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <Card className="rounded-2xl shadow-lg border-0">
              <CardHeader className="bg-[#FF5A71] text-white rounded-t-2xl">
                <CardTitle className="flex items-center">
                  <Upload className="w-6 h-6 mr-3" />
                  Upload Screenshot
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ImageUpload 
                  onOCRComplete={handleOCRComplete} 
                  isProcessing={isProcessing}
                />
              </CardContent>
            </Card>

            {/* Manual Entry Option */}
            <Card className="rounded-2xl shadow-lg border-0">
              <CardHeader className="bg-gray-800 text-white rounded-t-2xl">
                <CardTitle className="flex items-center">
                  <Edit3 className="w-6 h-6 mr-3" />
                  Manual Entry
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-gray-600 mb-6">
                    Prefer to enter data manually? Skip the screenshot upload and input your quote details directly.
                  </p>
                  <Button
                    onClick={() => setShowManualEntry(true)}
                    variant="outline"
                    className="rounded-full px-8 py-3"
                  >
                    Enter Manually
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : showManualEntry ? (
          <ManualEntry onSubmit={handleManualData} onCancel={() => setShowManualEntry(false)} />
        ) : (
          <div ref={quoteRef}>
            <QuoteTables data={quoteData!} />
          </div>
        )}

        {/* OCR Debug Info (only in development) */}
        {ocrText && process.env.NODE_ENV === 'development' && (
          <Card className="mt-8 rounded-2xl shadow-lg border-0">
            <CardHeader>
              <CardTitle>OCR Debug Output</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm bg-gray-100 p-4 rounded-lg overflow-auto max-h-60">
                {ocrText}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default QuoteGenerator;
