import { create } from 'zustand';

export const useLabelStore = create((set, get) => ({
  images: [], // Now array of objects: { name, isLabeled }
  currentImageIndex: 0,
  boxes: [],
  selectedClassId: 0,
  classes: ['helmet', 'head', 'person'], // hard hat dataset classes
  selectedBoxIndex: null, // For selection mode
  toolMode: 'draw', // 'draw' or 'select'
  isSaving: false,
  isUploading: false,
  isInferring: false,
  autoSave: false,

  toggleAutoSave: () => set((state) => ({ autoSave: !state.autoSave })),

  setImages: (images) => {
    set({ images, currentImageIndex: 0, boxes: [] });
    if (images.length > 0) {
      get().setCurrentImage(0);
    }
  },
  
  setCurrentImage: async (index) => {
    const images = get().images;
    if (index >= 0 && index < images.length) {
      set({ currentImageIndex: index, boxes: [], selectedBoxIndex: null });
      
      const currentImage = images[index];
      const imageName = typeof currentImage === 'string' ? currentImage : currentImage.name;
      const filename = imageName.replace(/\.[^/.]+$/, "") + ".txt";
      
      try {
        const res = await fetch(`http://localhost:3001/api/labels/${filename}`);
        if (res.ok) {
          const text = await res.text();
          const loadedBoxes = text.trim().split('\n')
            .filter(l => l.trim().length > 0)
            .map(line => {
              const parts = line.trim().split(/\s+/);
              return {
                classId: Number(parts[0]),
                xCenter: Number(parts[1]),
                yCenter: Number(parts[2]),
                width: Number(parts[3]),
                height: Number(parts[4])
              };
            });
          set({ boxes: loadedBoxes });
        }
      } catch (err) {
        // Label doesn't exist or error, just leave boxes empty
      }
    }
  },

  addBox: (box) => {
    set((state) => {
      const newBoxes = [...state.boxes, box];
      return { boxes: newBoxes, selectedBoxIndex: state.toolMode === 'select' ? newBoxes.length - 1 : state.selectedBoxIndex };
    });
    if (get().autoSave) get().saveLabels();
  },
  
  removeBox: (index) => {
    set((state) => {
      const newBoxes = state.boxes.filter((_, i) => i !== index);
      return {
        boxes: newBoxes,
        selectedBoxIndex: state.selectedBoxIndex === index ? null : 
                          state.selectedBoxIndex > index ? state.selectedBoxIndex - 1 : state.selectedBoxIndex
      };
    });
    if (get().autoSave) get().saveLabels();
  },

  updateBox: (index, newBox) => {
    set((state) => {
      const newBoxes = [...state.boxes];
      newBoxes[index] = { ...newBoxes[index], ...newBox };
      return { boxes: newBoxes };
    });
    if (get().autoSave) get().saveLabels();
  },

  undoLastBox: () => {
    set((state) => {
      const newBoxes = state.boxes.slice(0, -1);
      return {
        boxes: newBoxes,
        selectedBoxIndex: state.selectedBoxIndex === newBoxes.length ? null : state.selectedBoxIndex
      };
    });
    if (get().autoSave) get().saveLabels();
  },

  clearBoxes: () => {
    set({ boxes: [], selectedBoxIndex: null });
    if (get().autoSave) get().saveLabels();
  },

  setSelectedClassId: (id) => set({ selectedClassId: id }),
  setSelectedBoxIndex: (index) => set({ selectedBoxIndex: index }),
  setToolMode: (mode) => set({ toolMode: mode, selectedBoxIndex: mode === 'draw' ? null : get().selectedBoxIndex }),
  
  addClass: (className) => set((state) => ({ classes: [...state.classes, className] })),

  saveLabels: async () => {
    const { images, currentImageIndex, boxes } = get();
    const currentImage = images[currentImageIndex];
    if (!currentImage) return false;

    set({ isSaving: true });
    
    // 확장자를 .txt로 변경
    const imageName = typeof currentImage === 'string' ? currentImage : currentImage.name;
    const filename = imageName.replace(/\.[^/.]+$/, "") + ".txt";
    
    // YOLO 포맷으로 변환 (class x_center y_center width height)
    // 소수점 6자리까지만 남김
    const content = boxes.map(b => 
      `${b.classId} ${b.xCenter.toFixed(6)} ${b.yCenter.toFixed(6)} ${b.width.toFixed(6)} ${b.height.toFixed(6)}`
    ).join('\n') + (boxes.length > 0 ? '\n' : ''); // 마지막 줄바꿈 추가

    try {
      const response = await fetch('http://localhost:3001/api/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, content })
      });
      
      if (response.ok) {
        // Update the isLabeled status locally
        set((state) => {
          const newImages = [...state.images];
          newImages[currentImageIndex] = { ...newImages[currentImageIndex], isLabeled: boxes.length > 0 };
          return { images: newImages, isSaving: false };
        });
        return true;
      } else {
        set({ isSaving: false });
        return false;
      }
    } catch (error) {
      console.error('Failed to save labels:', error);
      set({ isSaving: false });
      return false;
    }
  },

  uploadImages: async (files) => {
    if (!files || files.length === 0) return;
    set({ isUploading: true });
    
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    try {
      const response = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        // Refresh image list
        const res = await fetch('http://localhost:3001/api/images');
        const data = await res.json();
        // Just update images array, keeping current index if possible
        set((state) => ({ 
          images: data, 
          isUploading: false,
          currentImageIndex: state.images.length === 0 ? 0 : state.currentImageIndex 
        }));
        if (get().images.length > 0 && get().boxes.length === 0) {
           get().setCurrentImage(get().currentImageIndex);
        }
        return true;
      }
    } catch (error) {
      console.error('Failed to upload images:', error);
    }
    set({ isUploading: false });
    return false;
  },

  deleteImage: async (filename) => {
    try {
      const response = await fetch(`http://localhost:3001/api/images/${filename}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        // Remove from local state
        set((state) => {
          const newImages = state.images.filter(img => {
            const name = typeof img === 'string' ? img : img.name;
            return name !== filename;
          });
          
          let newIndex = state.currentImageIndex;
          if (newIndex >= newImages.length) {
            newIndex = Math.max(0, newImages.length - 1);
          }
          
          return { images: newImages, currentImageIndex: newIndex };
        });
        
        // Reload current image data if list is not empty
        if (get().images.length > 0) {
          get().setCurrentImage(get().currentImageIndex);
        } else {
          set({ boxes: [], selectedBoxIndex: null });
        }
        return true;
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
    return false;
  },

  runAutoLabeling: async (prompt = "", threshold = 0.05) => {
    const { images, currentImageIndex, autoSave } = get();
    const currentImage = images[currentImageIndex];
    if (!currentImage) return;

    const imageName = typeof currentImage === 'string' ? currentImage : currentImage.name;
    
    set({ isInferring: true });
    
    try {
      const response = await fetch('http://localhost:3001/api/infer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: imageName, prompt, threshold })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.boxes) {
          set((state) => {
            const currentClasses = [...state.classes];
            const mappedBoxes = data.boxes.map(box => {
              // Convert model label to Capitalized
              const labelName = box.label ? box.label.charAt(0).toUpperCase() + box.label.slice(1) : 'Object';
              let classId = currentClasses.findIndex(c => c.toLowerCase() === labelName.toLowerCase());
              if (classId === -1) {
                classId = currentClasses.length;
                currentClasses.push(labelName);
              }
              return { ...box, classId };
            });
            return { 
              classes: currentClasses,
              boxes: [...state.boxes, ...mappedBoxes],
              isInferring: false
            };
          });
          if (get().autoSave) get().saveLabels();
          return true;
        }
      } else {
        alert('백엔드 서버와 통신할 수 없습니다. (터미널에서 Node.js 서버를 재시작했는지 확인해주세요!)');
      }
    } catch (error) {
      console.error('Failed to run auto labeling:', error);
      alert('AI 추론 중 오류가 발생했습니다.');
    }
    
    set({ isInferring: false });
    return false;
  }
}));
