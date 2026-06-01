import React, { useRef, useState, useMemo } from 'react';
import { useLabelStore } from '../store/useLabelStore';
import { Image as ImageIcon, FolderOpen, Upload, Loader2, CheckCircle2, Filter, Trash2 } from 'lucide-react';

function Sidebar() {
  const { images, currentImageIndex, setCurrentImage, uploadImages, isUploading } = useLabelStore();
  const fileInputRef = useRef(null);
  const [filter, setFilter] = useState('all'); // 'all', 'labeled', 'unlabeled'
  const [width, setWidth] = useState(288); // Default 288px (w-72)
  const isDragging = useRef(false);

  const handleMouseDown = (e) => {
    e.preventDefault(); // Prevent default text selection
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none'; // Disable text selection globally while dragging
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (isDragging.current) {
      requestAnimationFrame(() => {
        setWidth(Math.max(200, Math.min(e.clientX, 600)));
      });
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.body.style.cursor = 'default';
    document.body.style.userSelect = ''; // Restore text selection
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadImages(e.target.files);
      e.target.value = ''; // Reset input
    }
  };

  const completedCount = useMemo(() => images.filter(img => img.isLabeled).length, [images]);
  const progressPercent = images.length === 0 ? 0 : Math.round((completedCount / images.length) * 100);

  const filteredImages = useMemo(() => {
    if (filter === 'labeled') return images.filter(img => img.isLabeled);
    if (filter === 'unlabeled') return images.filter(img => !img.isLabeled);
    return images;
  }, [images, filter]);

  return (
    <aside 
      className="bg-gray-900 border-r border-gray-800 flex flex-col h-full shadow-xl z-20 flex-shrink-0 relative"
      style={{ width: `${width}px` }}
    >
      <div 
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-500 z-50 transition-colors"
        onMouseDown={handleMouseDown}
      />
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

      {/* Task Statistics */}
      <div className="p-4 border-b border-gray-800 bg-gray-950/30">
        <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">작업 통계</h3>
        <div className="flex gap-2 mb-3">
          <div className="flex-1 bg-gray-800/50 p-2 rounded-lg border border-gray-700/50">
            <div className="text-xs text-gray-400 mb-1 text-center">완료</div>
            <div className="text-lg font-bold text-emerald-400 text-center">{completedCount}</div>
          </div>
          <div className="flex-1 bg-gray-800/50 p-2 rounded-lg border border-gray-700/50">
            <div className="text-xs text-gray-400 mb-1 text-center">남은 이미지</div>
            <div className="text-lg font-bold text-indigo-400 text-center">{images.length - completedCount}</div>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
          <span>전체 진행률</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500 ease-out" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Filter */}
      <div className="px-4 py-3 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Filter size={14} className="text-gray-500" />
          <span>필터</span>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-md px-2 py-1 outline-none focus:border-indigo-500"
        >
          <option value="all">전체 이미지</option>
          <option value="labeled">라벨링 완료</option>
          <option value="unlabeled">라벨링 미완료</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
        {filteredImages.length === 0 ? (
          <div className="text-center text-sm text-gray-500 mt-10">
            {images.length === 0 ? '업로드된 이미지가 없습니다' : '조건에 맞는 이미지가 없습니다'}
          </div>
        ) : (
          filteredImages.map((img, idx) => {
            const isActive = images.indexOf(img) === currentImageIndex;
            const imageName = typeof img === 'string' ? img : img.name;
            const isLabeled = typeof img === 'string' ? false : img.isLabeled;
            
            return (
              <div
                key={imageName}
                onClick={() => setCurrentImage(images.indexOf(img))}
                className={`group cursor-pointer w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors ${
                  isActive 
                    ? 'bg-indigo-600/20 text-indigo-300 border-l-2 border-indigo-500' 
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border-l-2 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <ImageIcon size={14} className={isActive ? 'text-indigo-400' : 'text-gray-500'} />
                  <span className="truncate text-sm font-medium">{imageName}</span>
                </div>
                <div className="flex items-center gap-2">
                  {isLabeled && (
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`'${imageName}' 이미지를 삭제하시겠습니까? (관련 라벨 파일도 삭제됩니다)`)) {
                        useLabelStore.getState().deleteImage(imageName);
                      }
                    }}
                    className="p-1 text-gray-500 hover:text-red-400 hover:bg-gray-700/50 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="이미지 삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
