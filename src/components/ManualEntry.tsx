
import React, { useState } from 'react';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QuoteData, ParsedField, FormData } from './QuoteGenerator';

interface ManualEntryProps {
  onSubmit: (data: QuoteData) => void;
  onCancel: () => void;
  formData: FormData;
}

const ManualEntry: React.FC<ManualEntryProps> = ({ onSubmit, onCancel, formData }) => {
  const [payFields, setPayFields] = useState<ParsedField[]>([
    { label: 'Gross Monthly Salary', amount: 0, currency: 'USD' }
  ]);
  const [employeeFields, setEmployeeFields] = useState<ParsedField[]>([
    { label: 'Net Salary', amount: 0, currency: 'USD' }
  ]);

  const currencies = ['USD', 'EUR', 'GBP', 'CLP', 'ARS', 'BRL', 'MXN', 'COP', 'PEN', 'BDT', 'INR', 'SGD', 'AUD', 'CAD', 'CHF', 'JPY', 'CNY'];

  const addField = (section: 'pay' | 'employee') => {
    const newField: ParsedField = { label: '', amount: 0, currency: 'USD' };
    
    switch (section) {
      case 'pay':
        setPayFields([...payFields, newField]);
        break;
      case 'employee':
        setEmployeeFields([...employeeFields, newField]);
        break;
    }
  };

  const removeField = (section: 'pay' | 'employee', index: number) => {
    switch (section) {
      case 'pay':
        setPayFields(payFields.filter((_, i) => i !== index));
        break;
      case 'employee':
        setEmployeeFields(employeeFields.filter((_, i) => i !== index));
        break;
    }
  };

  const updateField = (section: 'pay' | 'employee', index: number, field: Partial<ParsedField>) => {
    const updateArray = (arr: ParsedField[]) => 
      arr.map((item, i) => i === index ? { ...item, ...field } : item);

    switch (section) {
      case 'pay':
        setPayFields(updateArray(payFields));
        break;
      case 'employee':
        setEmployeeFields(updateArray(employeeFields));
        break;
    }
  };

  const handleSubmit = () => {
    // Find gross salary
    const grossSalaryField = payFields.find(f => 
      f.label.toLowerCase().includes('gross') && f.label.toLowerCase().includes('salary')
    );
    
    if (!grossSalaryField || grossSalaryField.amount <= 0) {
      return;
    }

    const salary = grossSalaryField.amount;
    const dismissalDeposit = Math.round(salary / 12 * 100) / 100;
    const eorFeeLocal = formData.eorFeeUSD; // Assume same currency for manual entry

    // Create enhanced pay fields with calculated values
    const enhancedPayFields = [
      ...payFields.filter(f => f.label.trim() && f.amount > 0),
      {
        label: 'Dismissal Deposit (1/12 salary)',
        amount: dismissalDeposit,
        currency: grossSalaryField.currency
      },
      {
        label: 'Ontop EOR Fee',
        amount: eorFeeLocal,
        currency: grossSalaryField.currency
      }
    ];

    const totalYouPay = enhancedPayFields.reduce((sum, field) => sum + field.amount, 0);

    const setupSummary: ParsedField[] = [
      {
        label: 'Security Deposit (1 month salary)',
        amount: salary,
        currency: grossSalaryField.currency
      },
      {
        label: 'Ontop EOR Fee',
        amount: eorFeeLocal,
        currency: grossSalaryField.currency
      }
    ];

    const data: QuoteData = {
      payFields: enhancedPayFields,
      employeeFields: employeeFields.filter(f => f.label.trim() && f.amount > 0),
      setupSummary,
      localCurrency: grossSalaryField.currency,
      quoteCurrency: formData.quoteCurrency,
      exchangeRate: 1, // Manual entry assumes no conversion needed
      dismissalDeposit,
      eorFeeLocal,
      totalYouPay
    };
    
    onSubmit(data);
  };

  const FieldEditor = ({ title, fields, section, colorClass }: {
    title: string;
    fields: ParsedField[];
    section: 'pay' | 'employee';
    colorClass: string;
  }) => (
    <Card className="rounded-2xl shadow-lg border-0">
      <CardHeader className={`${colorClass} text-white`}>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <Button
            onClick={() => addField(section)}
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {fields.map((field, index) => (
          <div key={index} className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-5">
              <Label htmlFor={`${section}-label-${index}`} className="text-sm font-medium">
                Description
              </Label>
              <Input
                id={`${section}-label-${index}`}
                value={field.label}
                onChange={(e) => updateField(section, index, { label: e.target.value })}
                placeholder="Enter description"
                className="mt-1"
              />
            </div>
            <div className="col-span-3">
              <Label htmlFor={`${section}-amount-${index}`} className="text-sm font-medium">
                Amount
              </Label>
              <Input
                id={`${section}-amount-${index}`}
                type="number"
                step="0.01"
                value={field.amount || ''}
                onChange={(e) => updateField(section, index, { amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
            <div className="col-span-3">
              <Label htmlFor={`${section}-currency-${index}`} className="text-sm font-medium">
                Currency
              </Label>
              <Select
                value={field.currency}
                onValueChange={(value) => updateField(section, index, { currency: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((curr) => (
                    <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1">
              {fields.length > 1 && (
                <Button
                  onClick={() => removeField(section, index)}
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Manual Entry</h2>
          <p className="text-gray-600 mt-1">Enter your quote details manually for {formData.clientName}</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleSubmit}
            className="bg-[#FF5A71] hover:bg-[#FF4461] text-white rounded-full px-6"
          >
            <Save className="w-4 h-4 mr-2" />
            Generate Quote
          </Button>
          <Button
            onClick={onCancel}
            variant="outline"
            className="rounded-full px-6"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>

      {/* Field Editors */}
      <div className="grid grid-cols-1 gap-8">
        <FieldEditor
          title="Amount You Pay"
          fields={payFields}
          section="pay"
          colorClass="bg-[#FF5A71]"
        />
        
        <FieldEditor
          title="Amount Employee Gets"
          fields={employeeFields}
          section="employee"
          colorClass="bg-green-600"
        />
      </div>
    </div>
  );
};

export default ManualEntry;
