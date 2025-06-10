import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Calculator,
  Download,
  Lightbulb,
  Loader2,
  ImagePlus,
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { useMutation } from "@tanstack/react-query";
import { generateQuotePDF } from '../utils/pdfGenerator';
import { extractDataFromImages } from '../utils/ocrParser';
import QuoteTables from './QuoteTables';
import { useScreenshot } from 'use-react-screenshot'

export interface ParsedField {
  label: string;
  amount: number;
  localAmount?: number;
  usdAmount?: number;
}

export interface QuoteData {
  payFields: ParsedField[];
  employeeFields: ParsedField[];
  exchangeRate: number;
  localCurrency: string;
}

export interface FormData {
  clientName: string;
  aeName: string;
}

const QuoteForm: React.FC<{ formData: FormData; setFormData: React.Dispatch<React.SetStateAction<FormData>> }> = ({ formData, setFormData }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Card className="rounded-2xl shadow-lg border-0">
      <CardHeader className="bg-gray-100 rounded-t-2xl">
        <CardTitle className="text-xl font-semibold">Client & AE Information</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="clientName">Client Name</Label>
            <Input
              type="text"
              id="clientName"
              name="clientName"
              value={formData.clientName}
              onChange={handleChange}
              placeholder="Enter client name"
            />
          </div>
          <div>
            <Label htmlFor="aeName">AE Name</Label>
            <Input
              type="text"
              id="aeName"
              name="aeName"
              value={formData.aeName}
              onChange={handleChange}
              placeholder="Enter AE name"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const DualImageUpload: React.FC<{ onImagesUploaded: (images: string[]) => void; isAnalyzing: boolean }> = ({ onImagesUploaded, isAnalyzing }) => {
  const [images, setImages] = useState<string[]>(['', '']);
  const [isHovering, setIsHovering] = useState<boolean[]>([false, false]);

  const handleImageUpload = (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImages = [...images];
        newImages[index] = reader.result as string;
        setImages(newImages);
        onImagesUploaded(newImages);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (index: number) => (event: React.ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(event.clipboardData.items);
    const image = items.find((item) => item.type.indexOf('image') !== -1);

    if (image) {
      const blob = image.getAsFile();
      if (blob) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const newImages = [...images];
          newImages[index] = reader.result as string;
          setImages(newImages);
          onImagesUploaded(newImages);
        };
        reader.readAsDataURL(blob);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[0, 1].map((index) => (
        <Card key={index} className="rounded-2xl shadow-lg border-0">
          <CardHeader className="bg-gray-100 rounded-t-2xl">
            <CardTitle className="text-xl font-semibold">
              {index === 0 ? 'Amount You Pay' : 'Amount Employee Gets'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div
              className="relative h-64 flex items-center justify-center rounded-xl overflow-hidden cursor-pointer group"
              onMouseEnter={() => setIsHovering(prev => {
                const newState = [...prev];
                newState[index] = true;
                return newState;
              })}
              onMouseLeave={() => setIsHovering(prev => {
                const newState = [...prev];
                newState[index] = false;
                return newState;
              })}
              onPaste={handlePaste(index)}
            >
              {images[index] ? (
                <img src={images[index]} alt={`Uploaded Quote ${index + 1}`} className="object-contain max-h-full max-w-full" />
              ) : (
                <>
                  <div className="absolute inset-0 bg-gray-50 opacity-80 transition-opacity duration-300 group-hover:opacity-100 z-10"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500 z-20">
                    <ImagePlus className="w-8 h-8" />
                  </div>
                  <span className="absolute bottom-4 text-sm text-gray-500 z-20 transition-opacity duration-300 group-hover:opacity-0">
                    Click or drag to upload
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload(index)}
                className="absolute inset-0 opacity-0 cursor-pointer z-30"
              />
            </div>
            {isHovering[index] && (
              <div className="text-center mt-3 text-gray-500">
                Paste image from clipboard (Ctrl+V)
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const QuoteGenerator: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    clientName: '',
    aeName: '',
  });
  const [ocrText, setOcrText] = useState<string>('');
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [imagesUploaded, setImagesUploaded] = useState<string[]>(['', '']);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const { toast } = useToast();

  const handleImagesUploaded = (images: string[]) => {
    setImagesUploaded(images);
  };

  const analyzeScreenshots = useCallback(async () => {
    if (!imagesUploaded[0] || !imagesUploaded[1]) {
      toast({
        title: "Error",
        description: "Please upload both screenshots before analyzing.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setQuoteData(null);

    try {
      const extractedData = await extractDataFromImages(imagesUploaded);
      setOcrText(extractedData.ocrText);
      setQuoteData(extractedData.quoteData);
      toast({
        title: "Success",
        description: "Screenshots analyzed successfully!",
      });
    } catch (error: any) {
      console.error("Error analyzing screenshots:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to analyze screenshots. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [imagesUploaded, toast]);

  React.useEffect(() => {
    analyzeScreenshots();
  }, [analyzeScreenshots]);

  const handleGeneratePDF = async () => {
    if (!quoteData) {
      toast({
        title: "Error",
        description: "Please analyze screenshots before generating PDF.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingPDF(true);
    try {
      const doc = await generateQuotePDF(formData);
      const fileName = `Ontop-Quote-${formData.clientName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast({
        title: "Success",
        description: "PDF generated successfully!",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#FF5A71] rounded-xl flex items-center justify-center">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Ontop Quote Generator</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Generate professional employment quotes by uploading screenshots of your Multiplier Quote
          </p>
        </div>

        <QuoteForm 
          formData={formData}
          setFormData={setFormData}
        />

        <DualImageUpload 
          onImagesUploaded={handleImagesUploaded}
          isAnalyzing={isAnalyzing}
        />

        <div className="mb-8">
          <Card className="rounded-2xl shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-2xl">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Tips for best results
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Ensure both images are clear and well-lit</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Remember to expand all sub-items in the Multiplier Quote. The only exception are European countries with a "Total Gross Monthly Salary" that contains a 13th or 14th salary in it. For those cases, please keep that item collapsed.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Include complete tables with all rows and columns. Make sure to crop from the text "Amount You Pay" to the very end. Same for the other table, from "Amount Employee Gets" to the last total row.</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>You can paste images from clipboard using Ctrl+V</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Click "Analyze Screenshots" when both images are uploaded</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {quoteData && (
          <div className="space-y-8">
            <QuoteTables 
              data={quoteData} 
              formData={formData}
            />
            
            <div className="flex justify-center">
              <Button 
                onClick={handleGeneratePDF}
                className="bg-[#FF5A71] hover:bg-[#E6485F] text-white px-8 py-3 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={isGeneratingPDF}
              >
                {isGeneratingPDF ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Generate PDF Quote
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteGenerator;
