import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QuoteData, FormData, ParsedField } from './QuoteGenerator';
import { formatAmount } from '../utils/formatters';

interface QuoteTablesProps {
  data: QuoteData;
  formData: FormData;
}

// Define known subtotal patterns with brand colors
const PAY_SUBTOTALS = [
  'total employer contribution',
  'extra mandatory payments',
  'total employment cost',
  'total monthly cost'
].map(s => s.toLowerCase());

const EMPLOYEE_SUBTOTALS = [
  'total employee contribution',
  'extra mandatory payments'
].map(s => s.toLowerCase());

// Ontop brand colors for subtotal highlighting
const SUBTOTAL_BG_COLOR = 'bg-[#FFF1F2]'; // Light pink background
const SUBTOTAL_TEXT_COLOR = 'text-[#FF5A71]'; // Ontop pink text

// Function to detect subtotals
const isSubtotal = (label: string, tableType: 'pay' | 'employee'): boolean => {
  const normalizedLabel = label.toLowerCase().trim();
  const subtotals = tableType === 'pay' ? PAY_SUBTOTALS : EMPLOYEE_SUBTOTALS;
  return subtotals.some(pattern => normalizedLabel.includes(pattern));
};

// Function to detect gross salary
const isGrossSalary = (label: string): boolean => {
  return label.toLowerCase().includes('gross monthly salary') || 
         label.toLowerCase().includes('total gross monthly salary');
};

// Function to override labels
const overrideLabel = (label: string, tableType: 'pay' | 'employee' | 'setup'): string => {
  if (tableType === 'pay') {
    // Only apply these overrides to the Amount You Pay table
    if (label.toLowerCase() === 'total monthly cost') {
      return 'Total Employment Cost';
    }
    if (label.toLowerCase() === 'total') {
      return 'Total Monthly Cost';
    }
  }
  return label;
};

const QuoteTables: React.FC<QuoteTablesProps> = ({ data, formData }) => {
  const formatCurrency = (amount: number, currency: string): string => {
    return `${formatAmount(amount)} ${currency}`;
  };

  // Special calculation for Amount You Pay table
  const calculatePayTableTotal = (fields: ParsedField[]) => {
    const totalMonthlyCost = fields.find(f => 
      f.label.toLowerCase().includes('total monthly cost') || 
      f.label.toLowerCase().includes('total employment cost')
    );
    const eorFee = fields.find(f => f.label.toLowerCase().includes('ontop eor fee'));
    const dismissalDeposit = fields.find(f => f.label.toLowerCase().includes('dismissal deposit'));

    if (totalMonthlyCost && eorFee && dismissalDeposit) {
      return {
        localTotal: (totalMonthlyCost.localAmount || 0) + 
                    (eorFee.localAmount || 0) + 
                    (dismissalDeposit.localAmount || 0),
        usdTotal: (totalMonthlyCost.usdAmount || 0) + 
                  (eorFee.usdAmount || 0) + 
                  (dismissalDeposit.usdAmount || 0)
      };
    }
    return { localTotal: 0, usdTotal: 0 };
  };

  // Standard total calculation for Setup Summary
  const calculateTotal = (fields: ParsedField[]) => {
    return fields.reduce((acc, field) => ({
      localTotal: acc.localTotal + (field.localAmount || field.amount),
      usdTotal: acc.usdTotal + (field.usdAmount || (field.amount / data.exchangeRate))
    }), { localTotal: 0, usdTotal: 0 });
  };

  const TableCard = ({ title, fields, colorClass, isPayTable = false, isEmployeeTable = false, isSetupTable = false }: { 
    title: string; 
    fields: ParsedField[]; 
    colorClass: string;
    isPayTable?: boolean;
    isEmployeeTable?: boolean;
    isSetupTable?: boolean;
  }) => {
    const totals = isPayTable ? calculatePayTableTotal(fields) : calculateTotal(fields);
    const showTotal = isPayTable || isSetupTable;
    const tableType = isPayTable ? 'pay' : isEmployeeTable ? 'employee' : 'setup';
    
    // Add CSS classes for PDF generation
    const containerClass = isPayTable ? 'amount-you-pay' : isEmployeeTable ? 'amount-employee-gets' : 'setup-summary';
    
    return (
      <Card className={`rounded-2xl shadow-lg border-0 overflow-hidden ${containerClass}`}>
        <CardHeader className="bg-[#FF5A71] text-white">
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {fields.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No data available for this section
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Description</th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                      Local ({data.localCurrency})
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                      USD
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {fields.map((field, index) => {
                    const isSubtotalRow = isSubtotal(field.label, tableType as 'pay' | 'employee');
                    const isNetSalary = isEmployeeTable && field.label.toLowerCase().includes('net monthly salary');
                    const isGross = isGrossSalary(field.label);
                    
                    const rowClass = `
                      ${isSubtotalRow ? `${SUBTOTAL_BG_COLOR} ${SUBTOTAL_TEXT_COLOR} font-semibold` : ''}
                      ${isNetSalary ? 'bg-gray-50 font-semibold' : ''}
                      ${isGross ? 'font-medium' : ''}
                      hover:bg-gray-50 transition-colors
                    `.trim();
                    
                    return (
                      <tr key={index} className={rowClass}>
                        <td className="px-6 py-4 text-sm">
                          {overrideLabel(field.label, tableType)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-right">
                          {formatCurrency(field.localAmount || field.amount, data.localCurrency)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-right">
                          {formatCurrency(field.usdAmount || (field.amount / data.exchangeRate), 'USD')}
                        </td>
                      </tr>
                    );
                  })}
                  {showTotal && fields.length > 0 && (
                    <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                      <td className="px-6 py-4 text-sm text-gray-900">Total</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                        {formatCurrency(totals.localTotal, data.localCurrency)}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                        {formatCurrency(totals.usdTotal, 'USD')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const SetupSummarySection = () => {
    // Calculate values for setup summary - use Total Employment Cost instead of Gross Salary
    const totalEmploymentCostField = data.payFields.find(field => 
      field.label.toLowerCase().includes('total employment cost') ||
      field.label.toLowerCase().includes('total monthly cost')
    );
    const eorFeeField = data.payFields.find(field => 
      field.label.toLowerCase().includes('ontop eor fee')
    );
    
    // Use Total Employment Cost as Security Deposit (not Gross Salary)
    const securityDepositLocal = totalEmploymentCostField?.localAmount || 0;
    const securityDepositUSD = totalEmploymentCostField?.usdAmount || 0;
    const eorFeeLocal = eorFeeField?.localAmount || 0;
    const eorFeeUSD = eorFeeField?.usdAmount || 0;
    
    const totalSetupLocal = securityDepositLocal + eorFeeLocal;
    const totalSetupUSD = securityDepositUSD + eorFeeUSD;

    return (
      <div className="setup-summary-container">
        <Card className="rounded-2xl shadow-lg border-0 overflow-hidden">
          <CardHeader className="bg-[#FF5A71] text-white">
            <CardTitle className="text-xl font-semibold">Setup Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Description</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    Local ({data.localCurrency})
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    USD
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    Security Deposit (1 month total cost)
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    {formatAmount(securityDepositLocal)} {data.localCurrency}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    {formatAmount(securityDepositUSD)} USD
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    Ontop EOR Fee
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    {formatAmount(eorFeeLocal)} {data.localCurrency}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    {formatAmount(eorFeeUSD)} USD
                  </td>
                </tr>
                <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    Total Setup Fee
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-bold">
                    {formatAmount(totalSetupLocal)} {data.localCurrency}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-bold">
                    {formatAmount(totalSetupUSD)} USD
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="header">
        <h2 className="text-3xl font-bold text-gray-900">Quote Summary</h2>
        <p className="text-gray-600 mt-1">
          Quote for {formData.clientName} • Generated by {formData.aeName}
        </p>
      </div>

      {/* Tables Stacked Vertically */}
      <div className="space-y-6">
        <TableCard
          title="Amount You Pay"
          fields={data.payFields}
          colorClass="bg-[#FF5A71]"
          isPayTable={true}
        />
        
        <TableCard
          title="Amount Employee Gets"
          fields={data.employeeFields}
          colorClass="bg-[#FF5A71]"
          isEmployeeTable={true}
        />
        
        <SetupSummarySection />
      </div>
    </div>
  );
};

export default QuoteTables;
