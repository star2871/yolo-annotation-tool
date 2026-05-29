import React, { useRef } from 'react';
import { useLabelStore } from '../store/useLabelStore';
import { Image as ImageIcon, FolderOpen, Upload, Loader2 } from 'lucide-react';

function Sidebar() {
  const { images, currentImageIndex, setCurrentImage, uploadImages, isUploading } = useLabelStore();
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadImages(e.target.files);
      e.target.value = ''; // Reset input
    }
  };

  return (
    <aside className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col h-full shadow-xl z-20">
      <div className="h-14 flex items-center justify-between px-5 border-b border-gray-800 bg-gray-900/50">
        <h2 className="font-semibold text-gray-200 flex items-center gap-2">
          <FolderOpen size={18} className="text-indigo-400" />
          이미지 목록 ({images.length})
        </h2>
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-gray-400 hover:text-white transition-colors bg-gray-800 hover:bg-indigo-600 p-1.5 rounded-md"
          title="이미지 업로드"
        >
          {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          multiple 
          accept="image/*" 
          className="hidden" 
        />
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {images.length === 0 ? (
          <div className="text-center text-sm text-gray-500 mt-10">
            업로드된 이미지가 없습니다
          </div>
        ) : (
          images.map((img, idx) => {
            const isActive = idx === currentImageIndex;
            return (
              <button
                key={img}
                onClick={() => setCurrentImage(idx)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all duration-200 group ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <ImageIcon size={16} className={isActive ? 'text-indigo-200' : 'text-gray-500 group-hover:text-gray-400'} />
                <span className="truncate flex-1 font-medium">{img}</span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
