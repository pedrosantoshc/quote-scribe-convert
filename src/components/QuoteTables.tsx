
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QuoteData, FormData, ParsedField } from './QuoteGenerator';

interface QuoteTablesProps {
  data: QuoteData;
  formData: FormData;
}

// Define known subtotal patterns
const PAY_SUBTOTALS = [
  'total employer contribution',
  'total monthly cost',
  'extra mandatory payments'
];

const EMPLOYEE_SUBTOTALS = [
  'total employee contribution'
];

// Function to detect subtotals
const isSubtotalRow = (label: string, tableType: 'pay' | 'employee'): boolean => {
  const subtotals = tableType === 'pay' ? PAY_SUBTOTALS : EMPLOYEE_SUBTOTALS;
  return subtotals.some(pattern => label.toLowerCase().includes(pattern));
};

// Function to detect gross salary
const isGrossSalary = (label: string): boolean => {
  return label.toLowerCase().includes('gross monthly salary') || 
         label.toLowerCase().includes('total gross monthly salary');
};

const QuoteTables: React.FC<QuoteTablesProps> = ({ data, formData }) => {
  const formatNumber = (amount: number): string => {
    // Format without thousand separators, using . for decimals only
    return amount.toFixed(2);
  };

  const formatCurrency = (amount: number, currency: string): string => {
    return `${formatNumber(amount)} ${currency}`;
  };

  // Special calculation for Amount You Pay table
  const calculatePayTableTotal = (fields: ParsedField[]) => {
    const totalMonthlyCost = fields.find(f => 
      f.label.toLowerCase().includes('total monthly cost')
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
    const showTotal = isPayTable || isSetupTable; // Only show totals for Pay and Setup tables
    const tableType = isPayTable ? 'pay' : 'employee';
    
    return (
      <Card className="rounded-2xl shadow-lg border-0 overflow-hidden">
        <CardHeader className={`${colorClass} text-white`}>
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
                    const isSubtotal = isSubtotalRow(field.label, tableType);
                    const isNetSalary = isEmployeeTable && field.label.toLowerCase().includes('net monthly salary');
                    const isGross = isGrossSalary(field.label);
                    
                    const rowClass = `
                      ${isSubtotal ? 'bg-gray-50 font-semibold' : ''}
                      ${isNetSalary ? 'bg-gray-50 font-semibold' : ''}
                      ${isGross ? 'font-medium' : ''}
                      hover:bg-gray-50 transition-colors
                    `.trim();
                    
                    return (
                      <tr key={index} className={rowClass}>
                        <td className="px-6 py-4 text-sm text-gray-900">{field.label}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                          {formatCurrency(field.localAmount || field.amount, data.localCurrency)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
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
          colorClass="bg-green-600"
          isEmployeeTable={true}
        />
        
        <TableCard
          title="Setup Summary"
          fields={data.setupSummary}
          colorClass="bg-blue-600"
          isSetupTable={true}
        />
      </div>

      {/* Exchange Rate Info */}
      {data.exchangeRate !== 1 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Exchange Rate:</strong> 1 {data.localCurrency} = {(1/data.exchangeRate).toFixed(4)} USD
            <br />
            <em>Rates are indicative and may vary. Contracts are always processed in local currency.</em>
          </p>
        </div>
      )}
    </div>
  );
};

export default QuoteTables;
