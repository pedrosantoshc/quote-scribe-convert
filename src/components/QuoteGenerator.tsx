
import React, { useState, useRef } from 'react';
import { Upload, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import DualImageUpload from './DualImageUpload';
import QuoteTables from './QuoteTables';
import DebugPanel from './DebugPanel';
import QuoteForm from './QuoteForm';
import { generatePDF } from '../utils/pdfGenerator';
import { parseOCRText } from '../utils/ocrParser';
import { convertCurrency, CurrencyRates } from '../utils/currencyConverter';

export interface ParsedField {
  label: string;
  amount: number;
  currency: string;
}

export interface QuoteData {
  payFields: ParsedField[];
  employeeFields: ParsedField[];
  setupSummary: ParsedField[];
  localCurrency: string;
  quoteCurrency: string;
  exchangeRate: number;
  dismissalDeposit: number;
  eorFeeLocal: number;
  totalYouPay: number;
}

export interface FormData {
  country: string;
  quoteCurrency: 'USD' | 'Local';
  aeName: string;
  clientName: string;
  eorFeeUSD: number;
}

const QuoteGenerator = () => {
  const [formData, setFormData] = useState<FormData>({
    country: '',
    quoteCurrency: 'USD',
    aeName: '',
    clientName: '',
    eorFeeUSD: 0
  });
  const [ocrTexts, setOcrTexts] = useState<{pay: string; employee: string}>({pay: '', employee: ''});
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currencyRates, setCurrencyRates] = useState<CurrencyRates | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [lastError, setLastError] = useState<string>('');
  const quoteRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleFormSubmit = (data: FormData) => {
    setFormData(data);
    setCurrentStep(2);
  };

  const handleDualOCRComplete = async (payText: string, employeeText: string) => {
    setOcrTexts({pay: payText, employee: employeeText});
    setIsProcessing(true);
    setShowDebugPanel(true);
    setLastError('');

    try {
      console.log('OCR Texts extracted:', {pay: payText, employee: employeeText});
      
      // Parse both OCR texts
      const payParsed = parseOCRText(payText);
      const employeeParsed = parseOCRText(employeeText);
      
      // Get currency conversion rates with error handling
      const rates = await convertCurrency();
      setCurrencyRates(rates);

      // Find gross salary from pay fields
      const grossSalaryField = payParsed.amountYouPay.find(f => 
        f.label.toLowerCase().includes('gross') && f.label.toLowerCase().includes('salary')
      );
      
      if (!grossSalaryField) {
        throw new Error("Could not find Gross Monthly Salary in the Amount You Pay table. Please ensure the screenshot contains a clear 'Gross Monthly Salary' field.");
      }

      const salary = grossSalaryField.amount;
      const dismissalDeposit = Math.round(salary / 12 * 100) / 100;
      
      // Calculate exchange rate for local currency
      const localCurrency = payParsed.localCurrency;
      const rateToLocal = rates.rates[localCurrency] || 1;
      
      // Calculate EOR fee in local currency
      const eorFeeLocal = formData.quoteCurrency === 'USD' 
        ? Math.round(formData.eorFeeUSD * rateToLocal * 100) / 100
        : formData.eorFeeUSD;

      // Calculate total you pay
      const payFieldsTotal = payParsed.amountYouPay.reduce((sum, field) => sum + field.amount, 0);
      const totalYouPay = payFieldsTotal + dismissalDeposit + eorFeeLocal;

      // Create setup summary
      const setupSummary: ParsedField[] = [
        {
          label: 'Security Deposit (1 month salary)',
          amount: salary,
          currency: localCurrency
        },
        {
          label: 'Ontop EOR Fee',
          amount: eorFeeLocal,
          currency: localCurrency
        }
      ];

      const data: QuoteData = {
        payFields: [
          ...payParsed.amountYouPay,
          {
            label: 'Dismissal Deposit (1/12 salary)',
            amount: dismissalDeposit,
            currency: localCurrency
          },
          {
            label: 'Ontop EOR Fee',
            amount: eorFeeLocal,
            currency: localCurrency
          }
        ],
        employeeFields: employeeParsed.amountEmployeeGets,
        setupSummary,
        localCurrency,
        quoteCurrency: formData.quoteCurrency,
        exchangeRate: rateToLocal,
        dismissalDeposit,
        eorFeeLocal,
        totalYouPay
      };

      setQuoteData(data);
      setCurrentStep(3);

      toast({
        title: "Success!",
        description: "Quote data extracted and calculated successfully.",
      });
    } catch (error) {
      console.error('Error processing OCR:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process the images. Please try again.';
      setLastError(errorMessage);
      
      toast({
        variant: "destructive",
        title: "Processing Error",
        description: errorMessage,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!quoteData || !quoteRef.current) return;

    try {
      await generatePDF(quoteRef.current, quoteData, formData);
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
    setFormData({
      country: '',
      quoteCurrency: 'USD',
      aeName: '',
      clientName: '',
      eorFeeUSD: 0
    });
    setOcrTexts({pay: '', employee: ''});
    setQuoteData(null);
    setIsProcessing(false);
    setShowDebugPanel(false);
    setCurrentStep(1);
    setLastError('');
  };

  const dismissError = () => {
    setLastError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Ontop Quote Generator</h1>
            <p className="text-gray-600">Upload screenshots of Multiplier tables to generate professional quotes</p>
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

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep ? 'bg-[#FF5A71] text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 3 && <div className="w-12 h-0.5 bg-gray-300 mx-2" />}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        {currentStep === 1 && (
          <QuoteForm onSubmit={handleFormSubmit} />
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            {/* Upload Section */}
            <Card className="rounded-2xl shadow-lg border-0">
              <CardHeader className="bg-[#FF5A71] text-white rounded-t-2xl">
                <CardTitle className="flex items-center">
                  <Upload className="w-6 h-6 mr-3" />
                  Upload Screenshots
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <DualImageUpload 
                  onOCRComplete={handleDualOCRComplete} 
                  isProcessing={isProcessing}
                />
              </CardContent>
            </Card>

            {/* Error Panel */}
            {lastError && (
              <Card className="rounded-2xl shadow-lg border-0 border-red-200">
                <CardHeader className="bg-red-500 text-white rounded-t-2xl">
                  <CardTitle className="flex items-center justify-between">
                    <span>Error</span>
                    <Button
                      onClick={dismissError}
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-red-600"
                    >
                      ×
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <p className="text-red-800 text-sm">{lastError}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {currentStep === 3 && quoteData && (
          <div className="space-y-8">
            <div ref={quoteRef}>
              <QuoteTables data={quoteData} formData={formData} />
            </div>

            {/* Disclaimers */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Important Notes:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Currency conversions based on rates on {new Date().toLocaleDateString()}, may vary—contracts always in local currency.</li>
                <li>• Setup Cost = one month's salary (Security Deposit) + Ontop fee; secures Ontop against potential defaults.</li>
                <li>• Dismissal Deposit = one-twelfth of salary, provisioned for future termination costs.</li>
              </ul>
            </div>

            {/* Debug Panel */}
            {showDebugPanel && (
              <DebugPanel ocrText={`PAY TABLE:\n${ocrTexts.pay}\n\nEMPLOYEE TABLE:\n${ocrTexts.employee}`} parsedData={quoteData} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteGenerator;
