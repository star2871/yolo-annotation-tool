import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import AnnotationWorkspace from './components/AnnotationWorkspace';
import LabelDataViewer from './components/LabelDataViewer';
import PerformanceDashboard from './components/PerformanceDashboard';
import { useLabelStore } from './store/useLabelStore';
import { Save, CheckCircle2, BarChart2 } from 'lucide-react';

function App() {
  const { setImages, saveLabels, setCurrentImage, currentImageIndex, images, undoLastBox, isSaving } = useLabelStore();
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  useEffect(() => {
    // Fetch images from backend
    fetch('http://localhost:3001/api/images')
      .then(res => res.json())
      .then(data => setImages(data))
      .catch(err => console.error('Failed to fetch images', err));
  }, [setImages]);

  // Keyboard Shortcuts (Zero-friction Workflow)
  useEffect(() => {
    const handleKeyDown = async (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Enter') {
        e.preventDefault();
        const success = await saveLabels();
        if (success) {
          setShowSaveToast(true);
          setTimeout(() => setShowSaveToast(false), 2000);
          
          // Move to next image automatically
          if (currentImageIndex < images.length - 1) {
            setCurrentImage(currentImageIndex + 1);
          }
        }
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        undoLastBox();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        // Simple undo for MVP
        e.preventDefault();
        undoLastBox();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveLabels, setCurrentImage, currentImageIndex, images.length, undoLastBox]);

  const handleManualSave = async () => {
    const success = await saveLabels();
    if (success) {
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 2000);
      if (currentImageIndex < images.length - 1) setCurrentImage(currentImageIndex + 1);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-gray-950 text-gray-100 overflow-hidden font-sans selection:bg-indigo-500 selection:text-white relative">
      {/* Toast Notification */}
      {showSaveToast && (
        <div className="absolute top-20 right-8 bg-emerald-900 border border-emerald-500 text-emerald-100 px-4 py-2.5 rounded-lg shadow-2xl flex items-center gap-2 z-50 animate-bounce">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span className="font-medium">저장 완료 및 다음으로 이동!</span>
        </div>
      )}

      {/* 사이드바: 이미지 목록 */}
      <Sidebar />

      {/* 메인 작업 영역 */}
      <main className="flex-1 min-w-0 flex flex-col relative bg-gray-900 shadow-inner">
        <header className="h-14 border-b border-gray-800 bg-gray-950/80 backdrop-blur-md flex items-center px-6 justify-between z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
              <span className="text-indigo-400">Yolo</span>Trace
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-400 font-mono bg-gray-800/50 px-3 py-1 rounded-md border border-gray-800">
              <span className="text-gray-300 font-bold border border-gray-600 px-1.5 py-0.5 rounded shadow-sm bg-gray-700/50">Enter</span> 저장 및 다음
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 font-mono bg-gray-800/50 px-3 py-1 rounded-md border border-gray-800">
              <span className="text-gray-300 font-bold border border-gray-600 px-1.5 py-0.5 rounded shadow-sm bg-gray-700/50">Ctrl+Z</span> 실행 취소
            </div>
            
            <button 
              onClick={() => setIsDashboardOpen(true)}
              className="flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-full transition-all border border-gray-700 text-gray-300 bg-gray-800 hover:bg-gray-700 hover:text-white"
            >
              <BarChart2 size={16} className="text-indigo-400" />
              성능 분석
            </button>
            
            <button 
              onClick={handleManualSave}
              disabled={isSaving}
              className={`flex items-center gap-2 text-sm font-medium px-5 py-1.5 rounded-full transition-all shadow-md border ${
                isSaving 
                  ? 'bg-indigo-900 border-indigo-800 text-indigo-400 cursor-not-allowed' 
                  : 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500 hover:shadow-indigo-500/25 active:scale-95'
              }`}
            >
              <Save size={16} className={isSaving ? 'animate-pulse' : ''} />
              {isSaving ? '저장 중...' : '라벨 저장'}
            </button>
          </div>
        </header>
        
        <div className="flex-1 min-w-0 p-6 flex justify-center items-center overflow-auto relative">
          <AnnotationWorkspace />
        </div>
      </main>

      {/* 우측 사이드바: 텍스트 포맷 뷰어 */}
      <LabelDataViewer />

      {/* 성능 분석 대시보드 모달 */}
      {isDashboardOpen && (
        <PerformanceDashboard onClose={() => setIsDashboardOpen(false)} currentClasses={useLabelStore.getState().classes} />
      )}
    </div>
  );
}

export default App;
