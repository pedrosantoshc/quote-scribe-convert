
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FormData } from './QuoteGenerator';

interface QuoteFormProps {
  onSubmit: (data: FormData) => void;
}

const COUNTRIES = [
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'CL', name: 'Chile', currency: 'CLP' },
  { code: 'AR', name: 'Argentina', currency: 'ARS' },
  { code: 'BR', name: 'Brazil', currency: 'BRL' },
  { code: 'MX', name: 'Mexico', currency: 'MXN' },
  { code: 'CO', name: 'Colombia', currency: 'COP' },
  { code: 'PE', name: 'Peru', currency: 'PEN' },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT' },
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'SG', name: 'Singapore', currency: 'SGD' },
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'CA', name: 'Canada', currency: 'CAD' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF' },
  { code: 'JP', name: 'Japan', currency: 'JPY' },
  { code: 'CN', name: 'China', currency: 'CNY' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'EU', name: 'European Union', currency: 'EUR' }
];

const QuoteForm: React.FC<QuoteFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<FormData>({
    country: '',
    quoteCurrency: 'USD',
    aeName: '',
    clientName: '',
    eorFeeUSD: 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.country || !formData.aeName || !formData.clientName) {
      return;
    }
    onSubmit(formData);
  };

  const selectedCountry = COUNTRIES.find(c => c.code === formData.country);

  return (
    <Card className="rounded-2xl shadow-lg border-0 max-w-2xl mx-auto">
      <CardHeader className="bg-[#FF5A71] text-white rounded-t-2xl">
        <CardTitle className="text-2xl font-semibold">Quote Details</CardTitle>
      </CardHeader>
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Country Selection */}
          <div>
            <Label htmlFor="country" className="text-base font-medium">
              Country *
            </Label>
            <Select value={formData.country} onValueChange={(value) => setFormData({...formData, country: value})}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name} ({country.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quote Currency */}
          <div>
            <Label className="text-base font-medium">Quote Currency *</Label>
            <RadioGroup 
              value={formData.quoteCurrency} 
              onValueChange={(value: 'USD' | 'Local') => setFormData({...formData, quoteCurrency: value})}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="USD" id="usd" />
                <Label htmlFor="usd">USD</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Local" id="local" />
                <Label htmlFor="local">Local ({selectedCountry?.currency || 'Currency'})</Label>
              </div>
            </RadioGroup>
          </div>

          {/* AE Name */}
          <div>
            <Label htmlFor="aeName" className="text-base font-medium">
              AE Name *
            </Label>
            <Input
              id="aeName"
              value={formData.aeName}
              onChange={(e) => setFormData({...formData, aeName: e.target.value})}
              placeholder="Enter Account Executive name"
              className="mt-2"
              required
            />
          </div>

          {/* Client Name */}
          <div>
            <Label htmlFor="clientName" className="text-base font-medium">
              Client Name *
            </Label>
            <Input
              id="clientName"
              value={formData.clientName}
              onChange={(e) => setFormData({...formData, clientName: e.target.value})}
              placeholder="Enter client company name"
              className="mt-2"
              required
            />
          </div>

          {/* Ontop EOR Fee */}
          <div>
            <Label htmlFor="eorFee" className="text-base font-medium">
              Ontop EOR Fee (USD)
            </Label>
            <Input
              id="eorFee"
              type="number"
              step="0.01"
              value={formData.eorFeeUSD || ''}
              onChange={(e) => setFormData({...formData, eorFeeUSD: parseFloat(e.target.value) || 0})}
              placeholder="0.00"
              className="mt-2"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-[#FF5A71] hover:bg-[#FF4461] text-white rounded-full py-3 text-lg font-medium"
            disabled={!formData.country || !formData.aeName || !formData.clientName}
          >
            Continue to Screenshots
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default QuoteForm;
