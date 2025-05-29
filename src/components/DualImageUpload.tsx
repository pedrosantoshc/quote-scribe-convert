
import React, { useState, useRef } from 'react';
import { Upload, Camera, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  
  const payFileInputRef = useRef<HTMLInputElement>(null);
  const employeeFileInputRef = useRef<HTMLInputElement>(null);

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

  // Trigger callback when both OCR processes are complete
  React.useEffect(() => {
    if (payOcrDone && employeeOcrDone) {
      onOCRComplete(payOcrText, employeeOcrText);
    }
  }, [payOcrDone, employeeOcrDone, payOcrText, employeeOcrText, onOCRComplete]);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>, type: 'pay' | 'employee') => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageDataUrl = e.target?.result as string;
        if (type === 'pay') {
          setPayImage(imageDataUrl);
          setPayOcrDone(false);
        } else {
          setEmployeeImage(imageDataUrl);
          setEmployeeOcrDone(false);
        }
        processImage(imageDataUrl, type);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, type: 'pay' | 'employee') => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageDataUrl = e.target?.result as string;
        if (type === 'pay') {
          setPayImage(imageDataUrl);
          setPayOcrDone(false);
        } else {
          setEmployeeImage(imageDataUrl);
          setEmployeeOcrDone(false);
        }
        processImage(imageDataUrl, type);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const UploadArea = ({ 
    title, 
    type, 
    image, 
    progress, 
    isDone, 
    fileInputRef 
  }: { 
    title: string; 
    type: 'pay' | 'employee'; 
    image: string | null; 
    progress: number; 
    isDone: boolean; 
    fileInputRef: React.RefObject<HTMLInputElement>; 
  }) => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
          isProcessing && !isDone
            ? 'border-[#FF5A71] bg-[#FFDDE0]/20' 
            : isDone
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 hover:border-[#FF5A71] hover:bg-[#FFDDE0]/10'
        }`}
        onDrop={(e) => handleDrop(e, type)}
        onDragOver={handleDragOver}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleImageSelect(e, type)}
          className="hidden"
        />

        {isProcessing && !isDone ? (
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
            <p className="text-green-600 font-medium">Processing Complete</p>
          </div>
        ) : (
          <div className="space-y-3">
            <Camera className="w-8 h-8 mx-auto text-gray-400" />
            <div>
              <p className="text-gray-600 mb-3">
                Drag and drop an image here, or click to select
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
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
          <h4 className="text-sm font-medium text-gray-700">Preview:</h4>
          <div className="border rounded-lg overflow-hidden">
            <img
              src={image}
              alt={`${title} screenshot`}
              className="w-full max-h-40 object-contain bg-gray-50"
            />
          </div>
        </div>
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
        />
        
        <UploadArea
          title="Amount Employee Gets"
          type="employee"
          image={employeeImage}
          progress={employeeOcrProgress}
          isDone={employeeOcrDone}
          fileInputRef={employeeFileInputRef}
        />
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Upload Instructions:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Upload clear screenshots of both Multiplier tables</li>
          <li>• Ensure text is readable and not blurry</li>
          <li>• Both uploads must complete before processing continues</li>
        </ul>
      </div>
    </div>
  );
};

export default DualImageUpload;
