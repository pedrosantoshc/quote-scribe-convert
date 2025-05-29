
import React, { useState, useRef } from 'react';
import { Upload, Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Tesseract from 'tesseract.js';

interface ImageUploadProps {
  onOCRComplete: (text: string) => void;
  isProcessing: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onOCRComplete, isProcessing }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageDataUrl = e.target?.result as string;
        setSelectedImage(imageDataUrl);
        processImage(imageDataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (imageDataUrl: string) => {
    try {
      console.log('Starting OCR processing...');
      setOcrProgress(0);

      const result = await Tesseract.recognize(
        imageDataUrl,
        'eng',
        {
          logger: (m) => {
            console.log('OCR Progress:', m);
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100));
            }
          },
        }
      );

      console.log('OCR completed:', result.data.text);
      onOCRComplete(result.data.text);
    } catch (error) {
      console.error('OCR Error:', error);
      onOCRComplete('');
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageDataUrl = e.target?.result as string;
        setSelectedImage(imageDataUrl);
        processImage(imageDataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
          isProcessing 
            ? 'border-[#FF5A71] bg-[#FFDDE0]/20' 
            : 'border-gray-300 hover:border-[#FF5A71] hover:bg-[#FFDDE0]/10'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        {isProcessing ? (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 mx-auto text-[#FF5A71] animate-spin" />
            <div>
              <p className="text-[#FF5A71] font-medium">Processing Image...</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-[#FF5A71] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${ocrProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-1">{ocrProgress}% complete</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Camera className="w-12 h-12 mx-auto text-gray-400" />
            <div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                Upload Multiplier Screenshot
              </p>
              <p className="text-gray-600 mb-4">
                Drag and drop an image here, or click to select
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-[#FF5A71] hover:bg-[#FF4461] text-white rounded-full px-6"
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose Image
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      {selectedImage && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Preview:</h4>
          <div className="border rounded-lg overflow-hidden">
            <img
              src={selectedImage}
              alt="Uploaded screenshot"
              className="w-full max-h-64 object-contain bg-gray-50"
            />
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Tips for best results:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Ensure the image is clear and well-lit</li>
          <li>• Include both "Amount You Pay" and "Amount Employee Gets" tables</li>
          <li>• Make sure all text is readable and not blurry</li>
          <li>• Crop the image to focus on the tables if possible</li>
        </ul>
      </div>
    </div>
  );
};

export default ImageUpload;
