import React, { useState, useRef } from 'react';
import { Upload, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import DualImageUpload from './DualImageUpload';
import QuoteTables from './QuoteTables';
import QuoteLayout from './QuoteLayout';
import DebugPanel from './DebugPanel';
import QuoteForm from './QuoteForm';
import { generatePDF } from '../utils/pdfGenerator';
import { convertCurrency, CurrencyRates } from '../utils/currencyConverter';

export interface ParsedField {
  label: string;
  amount: number;
  currency: string;
  localAmount?: number;
  usdAmount?: number;
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
    eorFeeUSD: 499  // Default value
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
      
      // Parse both OCR texts using new separate functions
      const { parsePayScreenshot, parseEmployeeScreenshot, getLocalCurrency, convertAmount } = await import('../utils/ocrParser');
      
      const payParsed = parsePayScreenshot(payText);
      const employeeParsed = parseEmployeeScreenshot(employeeText);
      
      // Log Severance Pay detection
      console.log('Severance Pay detected in OCR:', payParsed.hasSeverancePay);
      
      // Get currency conversion rates with error handling
      const rates = await convertCurrency();
      setCurrencyRates(rates);

      const localCurrency = getLocalCurrency(formData.country);
      const rateToLocal = rates.rates[localCurrency] || 1;
      const rateToUSD = 1 / rateToLocal;

      // Calculate EOR fee in local currency
      const eorFeeLocal = formData.eorFeeUSD * rateToLocal;

      // Convert amounts based on quote currency using consistent conversion function
      const convertedPayFields = payParsed.payFields.map(field => {
        const converted = convertAmount(field.amount, field.currency, localCurrency, rateToLocal, rateToUSD);
        return {
          ...field,
          ...converted
        };
      });

      const convertedEmployeeFields = employeeParsed.employeeFields.map(field => {
        const converted = convertAmount(field.amount, field.currency, localCurrency, rateToLocal, rateToUSD);
        return {
          ...field,
          ...converted
        };
      });

      // Get gross salary in USD (always use USD for calculations)
      const grossSalaryUSD = formData.quoteCurrency === 'USD' ? payParsed.grossSalary : payParsed.grossSalary * rateToUSD;

      // Find the total monthly cost field
      const totalMonthlyCostField = convertedPayFields.find(f => 
        f.label.toLowerCase().includes('total monthly cost')
      );

      // Conditionally add Dismissal Deposit only if Severance Pay is NOT detected
      const finalPayFields = [...convertedPayFields];
      
      if (!payParsed.hasSeverancePay) {
        console.log('Adding Dismissal Deposit since no Severance Pay detected');
        const dismissalDeposit: ParsedField = {
          label: 'Dismissal Deposit (1/12 salary)',
          amount: grossSalaryUSD / 12,
          currency: 'USD',
          localAmount: (grossSalaryUSD / 12) * rateToLocal,
          usdAmount: grossSalaryUSD / 12
        };
        finalPayFields.push(dismissalDeposit);
      } else {
        console.log('Skipping Dismissal Deposit since Severance Pay is present');
      }

      // Always add EOR fee
      const eorFee: ParsedField = {
        label: 'Ontop EOR Fee',
        amount: formData.eorFeeUSD,
        currency: 'USD',
        localAmount: eorFeeLocal,
        usdAmount: formData.eorFeeUSD
      };
      finalPayFields.push(eorFee);

      // Create proper setup summary using Total Employment Cost instead of Gross Salary
      const totalEmploymentCostField = convertedPayFields.find(f => 
        f.label.toLowerCase().includes('total employment cost') ||
        f.label.toLowerCase().includes('total monthly cost')
      );

      const setupSummary: ParsedField[] = [
        {
          label: 'Security Deposit (1 month total cost)',
          amount: totalEmploymentCostField?.usdAmount || 0,
          currency: 'USD',
          localAmount: totalEmploymentCostField?.localAmount || 0,
          usdAmount: totalEmploymentCostField?.usdAmount || 0
        },
        {
          label: 'Ontop EOR Fee',
          amount: formData.eorFeeUSD,
          currency: 'USD',
          localAmount: eorFeeLocal,
          usdAmount: formData.eorFeeUSD
        }
      ];

      // Calculate total for Amount You Pay table (adjusted for conditional dismissal deposit)
      const dismissalDepositAmount = payParsed.hasSeverancePay ? 0 : (grossSalaryUSD / 12) * rateToLocal;
      const dismissalDepositUSD = payParsed.hasSeverancePay ? 0 : grossSalaryUSD / 12;
      
      const totalYouPayLocal = (totalMonthlyCostField?.localAmount || 0) + 
                               (eorFee.localAmount || 0) + 
                               dismissalDepositAmount;
      const totalYouPayUSD = (totalMonthlyCostField?.usdAmount || 0) + 
                             (eorFee.usdAmount || 0) + 
                             dismissalDepositUSD;

      const data: QuoteData = {
        payFields: finalPayFields,
        employeeFields: convertedEmployeeFields,
        setupSummary,
        localCurrency,
        quoteCurrency: formData.quoteCurrency,
        exchangeRate: rateToLocal,
        dismissalDeposit: dismissalDepositUSD,
        eorFeeLocal: eorFeeLocal,
        totalYouPay: totalYouPayLocal
      };

      setQuoteData(data);
      setCurrentStep(3);

      toast({
        title: "Success!",
        description: `Quote data extracted successfully. ${payParsed.hasSeverancePay ? 'Severance Pay detected - Dismissal Deposit excluded.' : 'No Severance Pay detected - Dismissal Deposit included.'}`,
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

  const handleAnalyzeScreenshots = async () => {
    if (!ocrTexts.pay || !ocrTexts.employee) {
      toast({
        variant: "destructive",
        title: "Missing Screenshots",
        description: "Please upload both screenshots before analyzing.",
      });
      return;
    }

    setIsProcessing(true);
    setLastError('');

    try {
      console.log('Analyzing OCR texts:', {pay: ocrTexts.pay, employee: ocrTexts.employee});
      
      // Parse both OCR texts using separate functions
      const { parsePayScreenshot, parseEmployeeScreenshot, getLocalCurrency } = await import('../utils/ocrParser');
      
      const payParsed = parsePayScreenshot(ocrTexts.pay);
      const employeeParsed = parseEmployeeScreenshot(ocrTexts.employee);
      
      // Get currency conversion rates with error handling
      const rates = await convertCurrency();
      setCurrencyRates(rates);

      const localCurrency = getLocalCurrency(formData.country);
      const rateToLocal = rates.rates[localCurrency] || 1;
      const rateToUSD = 1 / rateToLocal;

      // Convert amounts based on quote currency
      const convertedPayFields = payParsed.payFields.map(field => {
        let localAmount, usdAmount;
        
        if (formData.quoteCurrency === 'USD') {
          usdAmount = field.amount;
          localAmount = field.amount * rateToLocal;
        } else {
          localAmount = field.amount;
          usdAmount = field.amount * rateToUSD;
        }

        return {
          ...field,
          localAmount,
          usdAmount
        };
      });

      const convertedEmployeeFields = employeeParsed.employeeFields.map(field => {
        let localAmount, usdAmount;
        
        if (formData.quoteCurrency === 'USD') {
          usdAmount = field.amount;
          localAmount = field.amount * rateToLocal;
        } else {
          localAmount = field.amount;
          usdAmount = field.amount * rateToUSD;
        }

        return {
          ...field,
          localAmount,
          usdAmount
        };
      });

      // Find the gross salary from the first item (should be "Gross Monthly Salary")
      const grossSalaryField = convertedPayFields.find(field => 
        field.label.toLowerCase().includes('gross') && field.label.toLowerCase().includes('salary')
      );
      
      if (!grossSalaryField) {
        throw new Error("Could not find Gross Monthly Salary in the parsed data");
      }

      const grossSalary = grossSalaryField.localAmount || grossSalaryField.amount;

      // Add computed fields to payFields
      const dismissalDeposit = grossSalary / 12;
      const eorFeeLocal = formData.quoteCurrency === 'USD' 
        ? formData.eorFeeUSD * rateToLocal 
        : formData.eorFeeUSD;
      const eorFeeUSD = formData.quoteCurrency === 'USD' 
        ? formData.eorFeeUSD 
        : formData.eorFeeUSD * rateToUSD;

      // Find total monthly cost from parsed data
      const totalCostField = convertedPayFields.find(field => 
        field.label.toLowerCase().includes('total') && field.label.toLowerCase().includes('cost')
      );
      
      const totalMonthlyCost = totalCostField ? 
        (totalCostField.localAmount || totalCostField.amount) : 
        convertedPayFields.reduce((sum, field) => sum + (field.localAmount || field.amount), 0);

      const totalEmployerCost = totalMonthlyCost + dismissalDeposit + eorFeeLocal;

      // Add computed rows to pay fields
      const finalPayFields = [
        ...convertedPayFields,
        {
          label: 'Dismissal Deposit (1/12 salary)',
          amount: dismissalDeposit,
          currency: localCurrency,
          localAmount: dismissalDeposit,
          usdAmount: dismissalDeposit * rateToUSD
        },
        {
          label: 'Ontop EOR Fee',
          amount: formData.eorFeeUSD,
          currency: formData.quoteCurrency === 'USD' ? 'USD' : localCurrency,
          localAmount: eorFeeLocal,
          usdAmount: eorFeeUSD
        },
        {
          label: 'Total Employer Cost',
          amount: totalEmployerCost,
          currency: localCurrency,
          localAmount: totalEmployerCost,
          usdAmount: totalEmployerCost * rateToUSD
        }
      ];

      // Create setup summary (empty for now as requested)
      const setupSummary: ParsedField[] = [];

      const data: QuoteData = {
        payFields: finalPayFields,
        employeeFields: convertedEmployeeFields,
        setupSummary,
        localCurrency,
        quoteCurrency: formData.quoteCurrency,
        exchangeRate: rateToLocal,
        dismissalDeposit,
        eorFeeLocal,
        totalYouPay: totalEmployerCost
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
              <QuoteLayout data={quoteData} formData={formData}>
                <QuoteTables data={quoteData} formData={formData} />
              </QuoteLayout>
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
