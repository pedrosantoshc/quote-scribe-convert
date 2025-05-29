
import React, { useState } from 'react';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QuoteData, ParsedField } from './QuoteGenerator';

interface ManualEntryProps {
  onSubmit: (data: QuoteData) => void;
  onCancel: () => void;
}

const ManualEntry: React.FC<ManualEntryProps> = ({ onSubmit, onCancel }) => {
  const [amountYouPay, setAmountYouPay] = useState<ParsedField[]>([
    { label: 'Gross Salary', amount: 0, currency: 'USD' }
  ]);
  const [amountEmployeeGets, setAmountEmployeeGets] = useState<ParsedField[]>([
    { label: 'Net Salary', amount: 0, currency: 'USD' }
  ]);
  const [setupSummary, setSetupSummary] = useState<ParsedField[]>([
    { label: 'Security Deposit', amount: 0, currency: 'USD' }
  ]);
  const [localCurrency, setLocalCurrency] = useState('USD');
  const [alternateCurrency, setAlternateCurrency] = useState('EUR');

  const currencies = ['USD', 'EUR', 'GBP', 'CLP', 'ARS', 'BRL', 'MXN', 'COP', 'PEN', 'BDT', 'INR', 'SGD', 'AUD', 'CAD', 'CHF', 'JPY', 'CNY'];

  const addField = (section: 'youPay' | 'employeeGets' | 'setup') => {
    const newField: ParsedField = { label: '', amount: 0, currency: localCurrency };
    
    switch (section) {
      case 'youPay':
        setAmountYouPay([...amountYouPay, newField]);
        break;
      case 'employeeGets':
        setAmountEmployeeGets([...amountEmployeeGets, newField]);
        break;
      case 'setup':
        setSetupSummary([...setupSummary, newField]);
        break;
    }
  };

  const removeField = (section: 'youPay' | 'employeeGets' | 'setup', index: number) => {
    switch (section) {
      case 'youPay':
        setAmountYouPay(amountYouPay.filter((_, i) => i !== index));
        break;
      case 'employeeGets':
        setAmountEmployeeGets(amountEmployeeGets.filter((_, i) => i !== index));
        break;
      case 'setup':
        setSetupSummary(setupSummary.filter((_, i) => i !== index));
        break;
    }
  };

  const updateField = (section: 'youPay' | 'employeeGets' | 'setup', index: number, field: Partial<ParsedField>) => {
    const updateArray = (arr: ParsedField[]) => 
      arr.map((item, i) => i === index ? { ...item, ...field } : item);

    switch (section) {
      case 'youPay':
        setAmountYouPay(updateArray(amountYouPay));
        break;
      case 'employeeGets':
        setAmountEmployeeGets(updateArray(amountEmployeeGets));
        break;
      case 'setup':
        setSetupSummary(updateArray(setupSummary));
        break;
    }
  };

  const handleSubmit = () => {
    const data: QuoteData = {
      amountYouPay: amountYouPay.filter(f => f.label.trim() && f.amount > 0),
      amountEmployeeGets: amountEmployeeGets.filter(f => f.label.trim() && f.amount > 0),
      setupSummary: setupSummary.filter(f => f.label.trim() && f.amount > 0),
      localCurrency,
      alternateCurrency,
      exchangeRate: 1
    };
    onSubmit(data);
  };

  const FieldEditor = ({ title, fields, section, colorClass }: {
    title: string;
    fields: ParsedField[];
    section: 'youPay' | 'employeeGets' | 'setup';
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
          <p className="text-gray-600 mt-1">Enter your quote details manually</p>
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

      {/* Currency Settings */}
      <Card className="rounded-2xl shadow-lg border-0">
        <CardHeader>
          <CardTitle>Currency Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="local-currency" className="text-sm font-medium">
              Local Currency
            </Label>
            <Select value={localCurrency} onValueChange={setLocalCurrency}>
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
          <div>
            <Label htmlFor="alternate-currency" className="text-sm font-medium">
              Alternate Currency
            </Label>
            <Select value={alternateCurrency} onValueChange={setAlternateCurrency}>
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
        </CardContent>
      </Card>

      {/* Field Editors */}
      <div className="grid grid-cols-1 gap-8">
        <FieldEditor
          title="Amount You Pay"
          fields={amountYouPay}
          section="youPay"
          colorClass="bg-[#FF5A71]"
        />
        
        <FieldEditor
          title="Amount Employee Gets"
          fields={amountEmployeeGets}
          section="employeeGets"
          colorClass="bg-green-600"
        />
        
        <FieldEditor
          title="Setup Summary"
          fields={setupSummary}
          section="setup"
          colorClass="bg-blue-600"
        />
      </div>
    </div>
  );
};

export default ManualEntry;
