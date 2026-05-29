import React, { useRef, useState } from 'react';
import { useLabelStore } from '../store/useLabelStore';
import BoundingBoxCanvas from './BoundingBoxCanvas';
import { Maximize, Image as ImageIcon } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function AnnotationWorkspace() {
  const { images, currentImageIndex, boxes } = useLabelStore();
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  
  const currentImage = images[currentImageIndex];
  const imageUrl = currentImage ? `${API_URL}/images/${currentImage}` : null;

  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    setImageSize({ width: naturalWidth, height: naturalHeight });
  };

  if (!imageUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full text-gray-500">
        <ImageIcon size={48} className="mb-4 opacity-30" />
        <p className="text-lg font-medium">작업할 이미지를 선택해주세요</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gray-950 rounded-xl border border-gray-800 shadow-2xl overflow-hidden">
      {/* Background Grid Pattern for empty spaces */}
      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#374151 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.15 }}></div>
      
      {/* Image Container */}
      <div className="relative group flex items-center justify-center max-w-full max-h-full p-4">
        {/* We use a div wrapper around img to perfectly contain the canvas */}
        <div className="relative inline-block shadow-2xl ring-1 ring-white/10">
          <img 
            src={`${API_URL}/images/${currentImage}`} 
            alt="Annotation" 
            onLoad={handleImageLoad}
            className="max-w-full max-h-[80vh] object-contain select-none block"
            draggable={false}
          />
          
          {/* Only render Canvas when image size is loaded */}
          {imageSize.width > 0 && (
            <BoundingBoxCanvas />
          )}
        </div>
      </div>

      {/* Helper Text */}
      <div className="absolute bottom-4 left-4 flex items-center gap-4 text-xs font-mono text-gray-400 bg-gray-900/90 px-4 py-2 rounded-lg border border-gray-700 backdrop-blur shadow-lg">
        <div className="flex items-center gap-2">
          <Maximize size={14} className="text-indigo-400" />
          <span>{imageSize.width} x {imageSize.height}px</span>
        </div>
        <div className="w-px h-4 bg-gray-700"></div>
        <div className="flex items-center gap-2 text-emerald-400">
          <span className="font-bold">{boxes.length}</span>
          <span>라벨 개수</span>
        </div>
      </div>
    </div>
  );
}

export default AnnotationWorkspace;
