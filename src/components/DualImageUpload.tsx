import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Loader2, CheckCircle, X, ChevronDown, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import Tesseract from 'tesseract.js';

interface DualImageUploadProps {
  onOCRComplete: (payText: string, employeeText: string) => void;
  isProcessing: boolean;
}

const DualImageUpload: React.FC<DualImageUploadProps> = ({ onOCRComplete, isProcessing }) => {
  const [payImage, setPayImage] = useState<string | null>(null);
  const [employeeImage, setEmployeeImage] = useState<string | null>(null);
  const [payOcrProgress, setPayOcrProgress] = useState<number>(0);
  const [employeeOcrProgress, setEmployeeOcrProgress] = useState<number>(0);
  const [payOcrText, setPayOcrText] = useState<string>('');
  const [employeeOcrText, setEmployeeOcrText] = useState<string>('');
  const [payOcrDone, setPayOcrDone] = useState(false);
  const [employeeOcrDone, setEmployeeOcrDone] = useState(false);
  const [showPayOcr, setShowPayOcr] = useState(false);
  const [showEmployeeOcr, setShowEmployeeOcr] = useState(false);
  const [activeUploadType, setActiveUploadType] = useState<'pay' | 'employee' | null>(null);
  
  const payFileInputRef = useRef<HTMLInputElement>(null);
  const employeeFileInputRef = useRef<HTMLInputElement>(null);

  // Add clipboard paste support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      
      if (items && activeUploadType) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              handleImageUpload(blob, activeUploadType);
            }
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [activeUploadType]);

  const handleImageUpload = (file: File, type: 'pay' | 'employee') => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageDataUrl = e.target?.result as string;
      if (type === 'pay') {
        setPayImage(imageDataUrl);
        setPayOcrDone(false);
        setPayOcrText('');
      } else {
        setEmployeeImage(imageDataUrl);
        setEmployeeOcrDone(false);
        setEmployeeOcrText('');
      }
      processImage(imageDataUrl, type);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (imageDataUrl: string, type: 'pay' | 'employee') => {
    try {
      console.log(`Starting OCR processing for ${type}...`);
      
      const progressSetter = type === 'pay' ? setPayOcrProgress : setEmployeeOcrProgress;
      progressSetter(0);

      const result = await Tesseract.recognize(
        imageDataUrl,
        'eng',
        {
          logger: (m) => {
            console.log(`OCR Progress (${type}):`, m);
            if (m.status === 'recognizing text') {
              progressSetter(Math.round(m.progress * 100));
            }
          },
        }
      );

      console.log(`OCR completed for ${type}:`, result.data.text);
      
      if (type === 'pay') {
        setPayOcrText(result.data.text);
        setPayOcrDone(true);
      } else {
        setEmployeeOcrText(result.data.text);
        setEmployeeOcrDone(true);
      }

    } catch (error) {
      console.error(`OCR Error for ${type}:`, error);
      if (type === 'pay') {
        setPayOcrText('');
        setPayOcrDone(true);
      } else {
        setEmployeeOcrText('');
        setEmployeeOcrDone(true);
      }
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>, type: 'pay' | 'employee') => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file, type);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, type: 'pay' | 'employee') => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file, type);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const clearImage = (type: 'pay' | 'employee') => {
    if (type === 'pay') {
      setPayImage(null);
      setPayOcrText('');
      setPayOcrDone(false);
      setPayOcrProgress(0);
      if (payFileInputRef.current) {
        payFileInputRef.current.value = '';
      }
    } else {
      setEmployeeImage(null);
      setEmployeeOcrText('');
      setEmployeeOcrDone(false);
      setEmployeeOcrProgress(0);
      if (employeeFileInputRef.current) {
        employeeFileInputRef.current.value = '';
      }
    }
  };

  const handleAnalyzeScreenshots = () => {
    if (payOcrDone && employeeOcrDone && payOcrText && employeeOcrText) {
      onOCRComplete(payOcrText, employeeOcrText);
    }
  };

  const canAnalyze = payOcrDone && employeeOcrDone && payOcrText && employeeOcrText && !isProcessing;

  const UploadArea = ({ 
    title, 
    type, 
    image, 
    progress, 
    isDone, 
    fileInputRef,
    ocrText,
    showOcr,
    setShowOcr
  }: { 
    title: string; 
    type: 'pay' | 'employee'; 
    image: string | null; 
    progress: number; 
    isDone: boolean; 
    fileInputRef: React.RefObject<HTMLInputElement>;
    ocrText: string;
    showOcr: boolean;
    setShowOcr: (show: boolean) => void;
  }) => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
          !isDone && image
            ? 'border-[#FF5A71] bg-[#FFDDE0]/20' 
            : isDone
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 hover:border-[#FF5A71] hover:bg-[#FFDDE0]/10'
        }`}
        onDrop={(e) => handleDrop(e, type)}
        onDragOver={handleDragOver}
        onFocus={() => setActiveUploadType(type)}
        onBlur={() => setActiveUploadType(null)}
        tabIndex={0}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleImageSelect(e, type)}
          className="hidden"
        />

        {!isDone && image ? (
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 mx-auto text-[#FF5A71] animate-spin" />
            <div>
              <p className="text-[#FF5A71] font-medium">Processing...</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-[#FF5A71] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-1">{progress}% complete</p>
            </div>
          </div>
        ) : isDone ? (
          <div className="space-y-3">
            <CheckCircle className="w-8 h-8 mx-auto text-green-500" />
            <p className="text-green-600 font-medium">OCR Complete</p>
            <Button
              onClick={() => clearImage(type)}
              variant="outline"
              size="sm"
              className="rounded-full px-4"
            >
              <X className="w-4 h-4 mr-2" />
              Change Image
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Camera className="w-8 h-8 mx-auto text-gray-400" />
            <div>
              <p className="text-gray-600 mb-3">
                Drag and drop, paste (Ctrl+V), or click to select
              </p>
              <Button
                onClick={() => {
                  setActiveUploadType(type);
                  fileInputRef.current?.click();
                }}
                variant="outline"
                className="rounded-full px-4"
                size="sm"
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose Image
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      {image && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Preview:</h4>
            <Button
              onClick={() => clearImage(type)}
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-800 hover:bg-red-50"
            >
              <X className="w-4 h-4 mr-1" />
              Remove
            </Button>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <img
              src={image}
              alt={`${title} screenshot`}
              className="w-full max-h-40 object-contain bg-gray-50"
            />
          </div>
        </div>
      )}

      {/* Raw OCR Text */}
      {isDone && ocrText && (
        <Collapsible open={showOcr} onOpenChange={setShowOcr}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <div className="flex items-center">
              <Eye className="w-4 h-4 mr-2" />
              <span className="font-medium text-gray-900">Show Raw OCR</span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${showOcr ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 p-4 bg-gray-900 rounded-lg">
              <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap overflow-auto max-h-40 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                {ocrText}
              </pre>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <UploadArea
          title="Amount You Pay"
          type="pay"
          image={payImage}
          progress={payOcrProgress}
          isDone={payOcrDone}
          fileInputRef={payFileInputRef}
          ocrText={payOcrText}
          showOcr={showPayOcr}
          setShowOcr={setShowPayOcr}
        />
        
        <UploadArea
          title="Amount Employee Gets"
          type="employee"
          image={employeeImage}
          progress={employeeOcrProgress}
          isDone={employeeOcrDone}
          fileInputRef={employeeFileInputRef}
          ocrText={employeeOcrText}
          showOcr={showEmployeeOcr}
          setShowOcr={setShowEmployeeOcr}
        />
      </div>

      {/* Analyze Button */}
      {canAnalyze && (
        <div className="flex justify-center">
          <Button
            onClick={handleAnalyzeScreenshots}
            disabled={!canAnalyze}
            className="bg-[#FF5A71] hover:bg-[#FF4461] text-white rounded-full px-8 py-3 shadow-lg transition-all duration-200 hover:shadow-xl"
          >
            Analyze Screenshots
          </Button>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Upload Instructions:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Upload clear screenshots of both Multiplier tables</li>
          <li>• Use drag & drop, paste images (Ctrl+V), or click to select</li>
          <li>• Ensure text is readable and not blurry</li>
          <li>• Use "Show Raw OCR" to verify the text was extracted correctly</li>
          <li>• Click "Analyze Screenshots" when both uploads are complete</li>
        </ul>
      </div>
    </div>
  );
};

export default DualImageUpload;
