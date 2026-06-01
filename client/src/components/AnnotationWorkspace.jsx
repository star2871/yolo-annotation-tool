import React, { useRef, useState } from 'react';
import { useLabelStore } from '../store/useLabelStore';
import BoundingBoxCanvas from './BoundingBoxCanvas';
import { Maximize, Image as ImageIcon, MousePointer2, Square, Trash2, Wand2, Loader2, Copy } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function AnnotationWorkspace() {
  const { images, currentImageIndex, boxes, toolMode, setToolMode, selectedBoxIndex, removeBox, classes, autoSave, toggleAutoSave, isInferring, runAutoLabeling } = useLabelStore();
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [aiPrompt, setAiPrompt] = useState("");
  const [sensitivity, setSensitivity] = useState("중"); // 상, 중, 하
  
  const currentImage = images[currentImageIndex];
  const imageName = currentImage ? (typeof currentImage === 'string' ? currentImage : currentImage.name) : null;
  const imageUrl = imageName ? `${API_URL}/images/${imageName}` : '';

  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    setImageSize({ width: naturalWidth, height: naturalHeight });
  };

  if (!imageUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full text-gray-500 bg-gray-950">
        <ImageIcon size={48} className="mb-4 opacity-30" />
        <p className="text-lg font-medium">작업할 이미지를 선택해주세요</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col bg-gray-950 rounded-xl border border-gray-800 shadow-2xl overflow-hidden">
      {/* Background Grid Pattern for empty spaces */}
      <div className="absolute inset-0 z-0" style={{ backgroundImage: 'radial-gradient(#374151 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.15 }}></div>
      
      {/* Toolbar Top Bar */}
      <div className="h-14 shrink-0 flex items-center justify-center gap-2 bg-gray-900/90 backdrop-blur border-b border-gray-800 px-4 z-20">
        <button 
          onClick={() => setToolMode('select')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${toolMode === 'select' ? 'bg-indigo-600 text-white shadow-inner' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
        >
          <MousePointer2 size={16} /> 선택
        </button>
        <button 
          onClick={() => setToolMode('draw')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${toolMode === 'draw' ? 'bg-indigo-600 text-white shadow-inner' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
        >
          <Square size={16} /> 박스 그리기
        </button>
        <div className="w-px h-6 bg-gray-700 mx-1"></div>
        <button 
          onClick={() => {
            if (selectedBoxIndex !== null) removeBox(selectedBoxIndex);
          }}
          disabled={selectedBoxIndex === null}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${selectedBoxIndex !== null ? 'text-red-400 hover:bg-red-950/50' : 'text-gray-600 cursor-not-allowed'}`}
        >
          <Trash2 size={16} /> 삭제
        </button>
        
        <div className="w-px h-6 bg-gray-700 mx-1"></div>
        
        {/* Auto Save Toggle */}
        <label className="flex items-center gap-2 cursor-pointer px-2 mr-2">
          <span className="text-sm font-medium text-gray-300">자동 저장</span>
          <div className="relative">
            <input type="checkbox" className="sr-only" checked={autoSave} onChange={toggleAutoSave} />
            <div className={`block w-10 h-6 rounded-full transition-colors ${autoSave ? 'bg-indigo-500' : 'bg-gray-700'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${autoSave ? 'transform translate-x-4' : ''}`}></div>
          </div>
        </label>
        
        <div className="w-px h-6 bg-gray-700 mx-1"></div>

        {/* AI Auto Labeling Input & Button */}
        <div className="flex items-center ml-2 bg-gray-800 rounded-md border border-gray-700 focus-within:border-purple-500 overflow-hidden shadow-sm">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="찾을 물체 (ex: head, hat)"
            className="bg-transparent text-sm text-gray-200 px-3 py-1.5 outline-none w-40 placeholder-gray-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isInferring && currentImage) {
                const thresholdVal = sensitivity === "상" ? 0.01 : sensitivity === "중" ? 0.02 : 0.04;
                runAutoLabeling(aiPrompt, thresholdVal);
              }
            }}
          />
          <button
            onClick={() => {
              const thresholdVal = sensitivity === "상" ? 0.01 : sensitivity === "중" ? 0.02 : 0.04;
              runAutoLabeling(aiPrompt, thresholdVal);
            }}
            disabled={isInferring || !currentImage}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-all whitespace-nowrap ${
              isInferring || !currentImage
                ? 'bg-purple-900/50 text-purple-400 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-500 active:bg-purple-700'
            }`}
          >
            {isInferring ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Wand2 size={16} />
            )}
            {isInferring ? '분석 중...' : 'AI 찾기'}
          </button>
        </div>

        {/* AI Sensitivity Dropdown */}
        <div className="flex items-center ml-2 bg-gray-800 rounded-md border border-gray-700 px-3 py-1.5 h-[34px] shadow-sm">
          <span className="text-xs text-gray-400 mr-2 whitespace-nowrap cursor-help" title="상: 많이 찾음 (오탐지 가능성 높음), 하: 깐깐하게 찾음">
            민감도:
          </span>
          <select
            value={sensitivity}
            onChange={(e) => setSensitivity(e.target.value)}
            className="bg-transparent text-sm text-gray-200 outline-none cursor-pointer appearance-none"
          >
            <option value="상" className="bg-gray-800 text-gray-200">상</option>
            <option value="중" className="bg-gray-800 text-gray-200">중</option>
            <option value="하" className="bg-gray-800 text-gray-200">하</option>
          </select>
        </div>
      </div>

      {/* Main Image Area */}
      <div className="relative group flex items-center justify-center w-full flex-1 p-4 min-h-0 overflow-hidden z-10">
        {/* We use a div wrapper around img to perfectly contain the canvas */}
        <div className="relative inline-block shadow-2xl ring-1 ring-white/10 h-full max-w-full flex items-center justify-center">
          <img 
            src={imageUrl} 
            alt="Annotation" 
            onLoad={handleImageLoad}
            className="max-w-full max-h-full object-contain select-none block"
            draggable={false}
          />
          
          {/* Only render Canvas when image size is loaded */}
          {imageSize.width > 0 && (
            <BoundingBoxCanvas />
          )}
        </div>
      </div>

      {/* Bottom Area: Info Bar & Thumbnails */}
      <div className="shrink-0 w-full min-w-0 bg-gray-900 border-t border-gray-800 flex flex-col z-20">
        
        {/* Info Bar Row */}
        <div className="h-10 w-full flex items-center justify-between px-4 border-b border-gray-800/50 bg-gray-900/80 overflow-hidden">
          <div className="flex items-center gap-4 text-xs font-mono text-gray-400 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">이미지 정보:</span>
              <span className="text-gray-300">{imageName} ({imageSize.width} x {imageSize.height})</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-mono">
            {selectedBoxIndex !== null && boxes[selectedBoxIndex] ? (
              <div className="flex items-center gap-3">
                <span className="text-gray-500 border-r border-gray-700 pr-3">
                  <span className="mr-1">선택됨:</span>
                  <span className="text-indigo-400 font-bold">{classes[boxes[selectedBoxIndex].classId]}</span>
                </span>
                <span className="text-gray-400">X: <span className="text-emerald-400">{boxes[selectedBoxIndex].xCenter.toFixed(3)}</span></span>
                <span className="text-gray-400">Y: <span className="text-emerald-400">{boxes[selectedBoxIndex].yCenter.toFixed(3)}</span></span>
                <span className="text-gray-400">W: <span className="text-emerald-400">{boxes[selectedBoxIndex].width.toFixed(3)}</span></span>
                <span className="text-gray-400">H: <span className="text-emerald-400">{boxes[selectedBoxIndex].height.toFixed(3)}</span></span>
              </div>
            ) : (
              <div className="text-gray-500">
                <span className="text-emerald-400 font-bold mr-1">{boxes.length}</span>개의 라벨 | 드래그하여 박스를 그리거나 선택하세요.
              </div>
            )}
          </div>
        </div>

        {/* Thumbnails Row (빠른 탐색) */}
        <div className="h-28 w-full p-2 flex items-center gap-2 overflow-x-auto custom-scrollbar bg-gray-950/50 min-w-0">
          {images.map((img, idx) => {
            const isActive = idx === currentImageIndex;
            const thumbName = typeof img === 'string' ? img : img.name;
            const thumbLabeled = typeof img === 'string' ? false : img.isLabeled;
            return (
              <button
                key={thumbName}
                onClick={() => useLabelStore.getState().setCurrentImage(idx)}
                className={`relative shrink-0 h-full aspect-video rounded-md overflow-hidden border-2 transition-all group ${
                  isActive ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'border-gray-800 hover:border-gray-600'
                }`}
                title={thumbName}
              >
                <img 
                  src={`${API_URL}/images/${thumbName}`} 
                  alt={thumbName} 
                  className={`w-full h-full object-cover transition-transform duration-300 ${isActive ? 'scale-105' : 'group-hover:scale-105 grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100'}`} 
                />
                {thumbLabeled && (
                  <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-gray-900 shadow-sm" />
                )}
                {isActive && (
                  <div className="absolute bottom-0 inset-x-0 bg-indigo-600/90 text-[10px] text-white font-medium py-0.5 text-center truncate px-1">
                    {thumbName}
                  </div>
                )}
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}

export default AnnotationWorkspace;
