import React, { useState, useRef, useEffect } from 'react';
import { Upload, Camera, Loader2, CheckCircle, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Tesseract from 'tesseract.js';

interface DualImageUploadProps {
  onOCRComplete: (payText: string, employeeText: string) => void;
  isProcessing: boolean;
}

const DualImageUpload: React.FC<DualImageUploadProps> = ({ onOCRComplete, isProcessing }) => {
  const [payImage, setPayImage] = useState<string | null>(null);
  const [employeeImage, setEmployeeImage] = useState<string | null>(null);
  const [payProgress, setPayProgress] = useState<number>(0);
  const [employeeProgress, setEmployeeProgress] = useState<number>(0);
  const [payComplete, setPayComplete] = useState(false);
  const [employeeComplete, setEmployeeComplete] = useState(false);
  const [isDraggingPay, setIsDraggingPay] = useState(false);
  const [isDraggingEmployee, setIsDraggingEmployee] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<{pay: File | null, employee: File | null}>({pay: null, employee: null});
  
  const payFileInputRef = useRef<HTMLInputElement>(null);
  const employeeFileInputRef = useRef<HTMLInputElement>(null);

  // Handle clipboard paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              // If pay image is empty, use it for pay, otherwise use for employee
              if (!payImage) {
                handlePayImageUpload(blob);
              } else if (!employeeImage) {
                handleEmployeeImageUpload(blob);
              }
            }
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [payImage, employeeImage]);

  const handlePayFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handlePayImageUpload(file);
    }
    
    // Reset input
    if (payFileInputRef.current) {
      payFileInputRef.current.value = '';
    }
  };

  const handleEmployeeFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleEmployeeImageUpload(file);
    }
    
    // Reset input
    if (employeeFileInputRef.current) {
      employeeFileInputRef.current.value = '';
    }
  };

  const handlePayImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageDataUrl = e.target?.result as string;
      setPayImage(imageDataUrl);
      setUploadedImages(prev => ({...prev, pay: file}));
      setPayComplete(false);
    };
    reader.readAsDataURL(file);
  };

  const handleEmployeeImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageDataUrl = e.target?.result as string;
      setEmployeeImage(imageDataUrl);
      setUploadedImages(prev => ({...prev, employee: file}));
      setEmployeeComplete(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePayImage = () => {
    setPayImage(null);
    setUploadedImages(prev => ({...prev, pay: null}));
    setPayComplete(false);
    setPayProgress(0);
  };

  const handleRemoveEmployeeImage = () => {
    setEmployeeImage(null);
    setUploadedImages(prev => ({...prev, employee: null}));
    setEmployeeComplete(false);
    setEmployeeProgress(0);
  };

  const processPayImage = async (imageDataUrl: string) => {
    try {
      console.log('Starting OCR processing for pay image...');
      setPayProgress(0);
      setPayComplete(false);

      const result = await Tesseract.recognize(
        imageDataUrl,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setPayProgress(Math.round(m.progress * 100));
            }
          },
        }
      );

      console.log('Pay OCR completed:', result.data.text);
      setPayComplete(true);
      return result.data.text;
    } catch (error) {
      console.error('Pay OCR Error:', error);
      setPayComplete(false);
      return '';
    }
  };

  const processEmployeeImage = async (imageDataUrl: string) => {
    try {
      console.log('Starting OCR processing for employee image...');
      setEmployeeProgress(0);
      setEmployeeComplete(false);

      const result = await Tesseract.recognize(
        imageDataUrl,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setEmployeeProgress(Math.round(m.progress * 100));
            }
          },
        }
      );

      console.log('Employee OCR completed:', result.data.text);
      setEmployeeComplete(true);
      return result.data.text;
    } catch (error) {
      console.error('Employee OCR Error:', error);
      setEmployeeComplete(false);
      return '';
    }
  };

  const handleAnalyzeScreenshots = async () => {
    if (!payImage || !employeeImage) {
      console.warn('Both images required for analysis');
      return;
    }

    try {
      // Process both images and get OCR results
      const [payText, employeeText] = await Promise.all([
        processPayImage(payImage),
        processEmployeeImage(employeeImage)
      ]);

      // Call the completion handler with both results
      onOCRComplete(payText, employeeText);
    } catch (error) {
      console.error('Error analyzing screenshots:', error);
    }
  };

  const handlePayDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingPay(false);
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handlePayImageUpload(file);
    }
  };

  const handleEmployeeDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingEmployee(false);
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleEmployeeImageUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pay Table Upload */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Amount You Pay Table</h3>
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
              isDraggingPay
                ? 'border-[#FF5A71] bg-[#FFDDE0]/20' 
                : payComplete
                ? 'border-green-500 bg-green-50'
                : isProcessing && payImage
                ? 'border-[#FF5A71] bg-[#FFDDE0]/20' 
                : 'border-gray-300 hover:border-[#FF5A71] hover:bg-[#FFDDE0]/10'
            }`}
            onDrop={handlePayDrop}
            onDragOver={handleDragOver}
            onDragEnter={() => setIsDraggingPay(true)}
            onDragLeave={() => setIsDraggingPay(false)}
          >
            <input
              ref={payFileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePayFileUpload}
              className="hidden"
            />

            {payComplete ? (
              <div className="space-y-3">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
                <p className="text-green-600 font-medium">Pay table processed!</p>
              </div>
            ) : isProcessing && payImage ? (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 mx-auto text-[#FF5A71] animate-spin" />
                <div>
                  <p className="text-[#FF5A71] font-medium">Processing Pay Table...</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-[#FF5A71] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${payProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{payProgress}% complete</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Camera className="w-12 h-12 mx-auto text-gray-400" />
                <div>
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Upload Pay Table
                  </p>
                  <Button
                    onClick={() => payFileInputRef.current?.click()}
                    className="bg-[#FF5A71] hover:bg-[#FF4461] text-white rounded-full px-6"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Image
                  </Button>
                </div>
              </div>
            )}
          </div>

          {payImage && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Preview:</h4>
                <Button
                  onClick={handleRemovePayImage}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <img
                  src={payImage}
                  alt="Pay table screenshot"
                  className="w-full max-h-48 object-contain bg-gray-50"
                />
              </div>
            </div>
          )}
        </div>

        {/* Employee Table Upload */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Amount Employee Gets Table</h3>
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
              isDraggingEmployee
                ? 'border-[#FF5A71] bg-[#FFDDE0]/20' 
                : employeeComplete
                ? 'border-green-500 bg-green-50'
                : isProcessing && employeeImage
                ? 'border-[#FF5A71] bg-[#FFDDE0]/20' 
                : 'border-gray-300 hover:border-[#FF5A71] hover:bg-[#FFDDE0]/10'
            }`}
            onDrop={handleEmployeeDrop}
            onDragOver={handleDragOver}
            onDragEnter={() => setIsDraggingEmployee(true)}
            onDragLeave={() => setIsDraggingEmployee(false)}
          >
            <input
              ref={employeeFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleEmployeeFileUpload}
              className="hidden"
            />

            {employeeComplete ? (
              <div className="space-y-3">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
                <p className="text-green-600 font-medium">Employee table processed!</p>
              </div>
            ) : isProcessing && employeeImage ? (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 mx-auto text-[#FF5A71] animate-spin" />
                <div>
                  <p className="text-[#FF5A71] font-medium">Processing Employee Table...</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-[#FF5A71] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${employeeProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{employeeProgress}% complete</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Camera className="w-12 h-12 mx-auto text-gray-400" />
                <div>
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Upload Employee Table
                  </p>
                  <Button
                    onClick={() => employeeFileInputRef.current?.click()}
                    className="bg-[#FF5A71] hover:bg-[#FF4461] text-white rounded-full px-6"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Image
                  </Button>
                </div>
              </div>
            )}
          </div>

          {employeeImage && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Preview:</h4>
                <Button
                  onClick={handleRemoveEmployeeImage}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <img
                  src={employeeImage}
                  alt="Employee table screenshot"
                  className="w-full max-h-48 object-contain bg-gray-50"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analyze Screenshots Button */}
      {payImage && employeeImage && !isProcessing && (
        <div className="flex justify-center">
          <Button
            onClick={handleAnalyzeScreenshots}
            className="w-full max-w-md px-6 py-3 bg-[#FF5A71] hover:bg-[#FF4461] text-white rounded-full text-lg font-medium transition-colors"
          >
            <Play className="w-5 h-5 mr-2" />
            Analyze Screenshots
          </Button>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Tips for best results:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Ensure both images are clear and well-lit</li>
          <li>• Include complete tables with all rows and columns</li>
          <li>• Make sure all text is readable and not blurry</li>
          <li>• You can paste images from clipboard using Ctrl+V</li>
          <li>• Crop images to focus on the tables if possible</li>
          <li>• Click "Analyze Screenshots" when both images are uploaded</li>
        </ul>
      </div>
    </div>
  );
};

export default DualImageUpload;
