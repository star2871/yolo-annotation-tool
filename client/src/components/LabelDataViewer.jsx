import React, { useState, useRef } from 'react';
import { useLabelStore } from '../store/useLabelStore';
import { Tag, Plus, Trash2, Edit2, ChevronDown } from 'lucide-react';

function LabelDataViewer() {
  const { 
    boxes, 
    classes, 
    addClass, 
    selectedClassId, 
    setSelectedClassId, 
    selectedBoxIndex, 
    setSelectedBoxIndex, 
    removeBox,
    clearBoxes
  } = useLabelStore();
  
  const [newClassName, setNewClassName] = useState('');
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [width, setWidth] = useState(320); // Default 320px (w-80)
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
        // For right sidebar, width = window.innerWidth - e.clientX
        setWidth(Math.max(250, Math.min(window.innerWidth - e.clientX, 600)));
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

  const handleAddClass = () => {
    if (newClassName.trim()) {
      addClass(newClassName.trim());
      setNewClassName('');
      setIsAddingClass(false);
      setSelectedClassId(classes.length); // Select the newly added class
    }
  };

  return (
    <aside 
      className="bg-gray-900 border-l border-gray-800 flex flex-col h-full shadow-xl z-20 flex-shrink-0 relative"
      style={{ width: `${width}px` }}
    >
      <div 
        className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-indigo-500/50 active:bg-indigo-500 z-50 transition-colors"
        onMouseDown={handleMouseDown}
      />
      <div className="h-14 flex items-center px-5 border-b border-gray-800 bg-gray-900/50">
        <h2 className="font-semibold text-gray-200 flex items-center gap-2">
          <Tag size={18} className="text-indigo-400" />
          클래스 및 라벨 관리
        </h2>
      </div>
      
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Class Management */}
        <div className="p-4 border-b border-gray-800 bg-gray-950/30">
          <h3 className="text-sm font-medium text-gray-300 mb-3">클래스 선택</h3>
          
          <div className="relative mb-3">
            <select 
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2.5 appearance-none focus:border-indigo-500 outline-none"
            >
              {classes.map((cls, idx) => (
                <option key={idx} value={idx}>{idx} - {cls}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {isAddingClass ? (
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddClass()}
                placeholder="새 클래스 이름"
                className="flex-1 bg-gray-800 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
                autoFocus
              />
              <button 
                onClick={handleAddClass}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                추가
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsAddingClass(true)}
              className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm py-2 rounded-lg transition-colors"
            >
              <Plus size={16} /> 클래스 추가
            </button>
          )}
        </div>

        {/* Label List */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-300">라벨 목록 ({boxes.length})</h3>
            {boxes.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('모든 라벨을 정말 삭제하시겠습니까?')) {
                    clearBoxes();
                  }
                }}
                className="flex items-center gap-1 px-2 py-1 bg-red-900/40 text-red-400 hover:bg-red-800/60 hover:text-red-200 rounded text-xs font-medium transition-colors"
              >
                <Trash2 size={12} />
                전체 삭제
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {boxes.length === 0 ? (
              <div className="text-center text-sm text-gray-500 mt-6">
                그려진 박스가 없습니다
              </div>
            ) : (
              boxes.map((box, idx) => {
                const isSelected = selectedBoxIndex === idx;
                return (
                  <div 
                    key={idx}
                    onClick={() => setSelectedBoxIndex(idx)}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-indigo-900/40 border-indigo-500/50 shadow-inner' 
                        : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded bg-gray-700 text-gray-300 flex items-center justify-center text-xs font-mono">
                        {box.classId}
                      </div>
                      <span className={`font-medium text-sm ${isSelected ? 'text-indigo-200' : 'text-gray-300'}`}>
                        {classes[box.classId]}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-mono text-gray-500 mr-2">1.00</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeBox(idx); }}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-md transition-colors"
                        title="삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

export default LabelDataViewer;
