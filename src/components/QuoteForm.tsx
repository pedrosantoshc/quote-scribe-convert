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
  'Albania', 'Arab Emirates', 'Argentina', 'Australia', 'Austria', 'Azerbaijan',
  'Bangladesh', 'Belgium', 'Bolivia', 'Brazil', 'Bulgaria', 'Cambodia', 'Canada',
  'Chile', 'China', 'Colombia', 'Croatia', 'Czech Republic', 'Denmark',
  'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Estonia', 'Finland',
  'France', 'Georgia', 'Germany', 'Greece', 'Guatemala', 'Honduras', 'Hong Kong',
  'India', 'Indonesia', 'Ireland', 'Italy', 'Jamaica', 'Japan', 'Kazakhstan',
  'Kenya', 'Latvia', 'Lithuania', 'Malawi', 'Malaysia', 'Malta', 'Mauritius',
  'Mexico', 'Moldova', 'Montenegro', 'Morocco', 'Namibia', 'Netherlands',
  'Nicaragua', 'North Macedonia', 'Panama', 'Paraguay', 'Peru', 'Philippines',
  'Poland', 'Portugal', 'Puerto Rico', 'Romania', 'Rwanda', 'Senegal',
  'Singapore', 'Slovakia', 'Slovenia', 'South Africa', 'South Korea', 'Spain',
  'Sri Lanka', 'Sweden', 'Taiwan', 'Tanzania', 'Thailand', 'Turkey', 'Uganda',
  'United Kingdom', 'Uruguay', 'USA', 'Venezuela', 'Zambia', 'Zimbabwe'
];

const CURRENCY_MAP: Record<string, string> = {
  "Albania": "ALL", "Arab Emirates": "AED", "Argentina": "ARS", "Australia": "AUD",
  "Austria": "EUR", "Azerbaijan": "AZN", "Bangladesh": "BDT", "Belgium": "EUR",
  "Bolivia": "BOB", "Brazil": "BRL", "Bulgaria": "BGN", "Cambodia": "KHR",
  "Canada": "CAD", "Chile": "CLP", "China": "CNY", "Colombia": "COP",
  "Croatia": "EUR", "Czech Republic": "CZK", "Denmark": "DKK",
  "Dominican Republic": "DOP", "Ecuador": "USD", "Egypt": "EGP",
  "El Salvador": "USD", "Estonia": "EUR", "Finland": "EUR", "France": "EUR",
  "Georgia": "GEL", "Germany": "EUR", "Greece": "EUR", "Guatemala": "GTQ",
  "Honduras": "HNL", "Hong Kong": "HKD", "India": "INR", "Indonesia": "IDR",
  "Ireland": "EUR", "Italy": "EUR", "Jamaica": "JMD", "Japan": "JPY",
  "Kazakhstan": "KZT", "Kenya": "KES", "Latvia": "EUR", "Lithuania": "EUR",
  "Malawi": "MWK", "Malaysia": "MYR", "Malta": "EUR", "Mauritius": "MUR",
  "Mexico": "MXN", "Moldova": "MDL", "Montenegro": "EUR", "Morocco": "MAD",
  "Namibia": "NAD", "Netherlands": "EUR", "Nicaragua": "NIO",
  "North Macedonia": "MKD", "Panama": "PAB", "Paraguay": "PYG",
  "Peru": "PEN", "Philippines": "PHP", "Poland": "PLN", "Portugal": "EUR",
  "Puerto Rico": "USD", "Romania": "RON", "Rwanda": "RWF", "Senegal": "XOF",
  "Singapore": "SGD", "Slovakia": "EUR", "Slovenia": "EUR", "South Africa": "ZAR",
  "South Korea": "KRW", "Spain": "EUR", "Sri Lanka": "LKR", "Sweden": "SEK",
  "Taiwan": "TWD", "Tanzania": "TZS", "Thailand": "THB", "Turkey": "TRY",
  "Uganda": "UGX", "United Kingdom": "GBP", "Uruguay": "UYU", "USA": "USD",
  "Venezuela": "VES", "Zambia": "ZMW", "Zimbabwe": "ZWL"
};

const QuoteForm: React.FC<QuoteFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<FormData>({
    country: '',
    quoteCurrency: 'USD',
    aeName: '',
    clientName: '',
    eorFeeUSD: 499  // Default value
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.country || !formData.aeName || !formData.clientName) {
      return;
    }
    onSubmit(formData);
  };

  const selectedCurrency = formData.country ? CURRENCY_MAP[formData.country] : '';

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
                  <SelectItem key={country} value={country}>
                    {country} ({CURRENCY_MAP[country]})
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
                <Label htmlFor="local">Local Currency</Label>
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
              placeholder="499.00"
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
