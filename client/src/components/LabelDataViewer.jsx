import React from 'react';
import { useLabelStore } from '../store/useLabelStore';
import { FileText, Copy, Check } from 'lucide-react';
import { useState } from 'react';

function LabelDataViewer() {
  const { boxes, currentImageIndex, images } = useLabelStore();
  const [copied, setCopied] = useState(false);

  const currentImage = images[currentImageIndex];
  const filename = currentImage ? currentImage.replace(/\.[^/.]+$/, "") + ".txt" : '선택된 이미지 없음';

  const generateYoloText = () => {
    if (boxes.length === 0) return '아직 생성된 라벨이 없습니다.';
    return boxes.map(b => 
      `${b.classId} ${b.xCenter.toFixed(6)} ${b.yCenter.toFixed(6)} ${b.width.toFixed(6)} ${b.height.toFixed(6)}`
    ).join('\n');
  };

  const textContent = generateYoloText();

  const handleCopy = () => {
    if (boxes.length === 0) return;
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col h-full shadow-xl z-20">
      <div className="h-14 flex items-center justify-between px-5 border-b border-gray-800 bg-gray-900/50">
        <h2 className="font-semibold text-gray-200 flex items-center gap-2">
          <FileText size={18} className="text-emerald-400" />
          원본 라벨 데이터
        </h2>
        <button 
          onClick={handleCopy}
          className="text-gray-400 hover:text-white transition-colors"
          title="클립보드에 복사"
        >
          {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
        </button>
      </div>
      
      <div className="flex flex-col p-4 flex-1">
        <div className="text-xs text-gray-500 font-mono mb-2 truncate bg-gray-950 px-2 py-1 rounded">
          파일명: {filename}
        </div>
        <div className="flex-1 bg-gray-950 rounded-lg border border-gray-800 p-3 overflow-auto custom-scrollbar">
          <pre className="text-sm font-mono text-emerald-300 whitespace-pre">
            {textContent}
          </pre>
        </div>
        <div className="mt-4 text-xs text-gray-500 bg-gray-800/50 p-3 rounded-lg border border-gray-700 leading-relaxed">
          <p className="font-semibold text-gray-400 mb-1">YOLO 포맷 가이드</p>
          <p>1. <span className="text-indigo-300">클래스 ID</span></p>
          <p>2. <span className="text-indigo-300">중심 X 좌표</span> (0~1)</p>
          <p>3. <span className="text-indigo-300">중심 Y 좌표</span> (0~1)</p>
          <p>4. <span className="text-indigo-300">너비</span> (0~1)</p>
          <p>5. <span className="text-indigo-300">높이</span> (0~1)</p>
        </div>
      </div>
    </aside>
  );
}

export default LabelDataViewer;
