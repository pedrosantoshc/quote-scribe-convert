
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { QuoteData } from './QuoteGenerator';

interface DebugPanelProps {
  ocrText: string;
  parsedData: QuoteData | null;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ ocrText, parsedData }) => {
  const [isOcrOpen, setIsOcrOpen] = React.useState(false);
  const [isParsedOpen, setIsParsedOpen] = React.useState(false);

  return (
    <Card className="rounded-2xl shadow-lg border-0">
      <CardHeader className="bg-gray-800 text-white rounded-t-2xl">
        <CardTitle className="text-xl font-semibold">Debug Data</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* Raw OCR Text Section */}
        <Collapsible open={isOcrOpen} onOpenChange={setIsOcrOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <span className="font-medium text-gray-900">Raw OCR Text</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isOcrOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 p-4 bg-gray-900 rounded-lg">
              <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap overflow-auto max-h-60 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                {ocrText || 'No OCR text available'}
              </pre>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Parsed Fields Section */}
        <Collapsible open={isParsedOpen} onOpenChange={setIsParsedOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <span className="font-medium text-gray-900">Parsed Fields</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isParsedOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 p-4 bg-gray-900 rounded-lg">
              <pre className="text-sm text-blue-400 font-mono whitespace-pre-wrap overflow-auto max-h-60 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                {parsedData ? JSON.stringify(parsedData, null, 2) : 'No parsed data available'}
              </pre>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default DebugPanel;
