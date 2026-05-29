import { create } from 'zustand';

export const useLabelStore = create((set, get) => ({
  images: [],
  currentImageIndex: 0,
  boxes: [],
  selectedClassId: 0,
  classes: ['object'], // 기본 클래스
  isSaving: false,
  isUploading: false,

  setImages: (images) => {
    set({ images, currentImageIndex: 0, boxes: [] });
    if (images.length > 0) {
      get().setCurrentImage(0);
    }
  },
  
  setCurrentImage: async (index) => {
    const images = get().images;
    if (index >= 0 && index < images.length) {
      set({ currentImageIndex: index, boxes: [] });
      
      const currentImage = images[index];
      const filename = currentImage.replace(/\.[^/.]+$/, "") + ".txt";
      
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

  addBox: (box) => set((state) => ({ boxes: [...state.boxes, box] })),
  
  removeBox: (index) => set((state) => ({
    boxes: state.boxes.filter((_, i) => i !== index)
  })),

  undoLastBox: () => set((state) => ({
    boxes: state.boxes.slice(0, -1)
  })),

  clearBoxes: () => set({ boxes: [] }),

  setSelectedClassId: (id) => set({ selectedClassId: id }),

  saveLabels: async () => {
    const { images, currentImageIndex, boxes } = get();
    const currentImage = images[currentImageIndex];
    if (!currentImage) return false;

    set({ isSaving: true });
    
    // 확장자를 .txt로 변경
    const filename = currentImage.replace(/\.[^/.]+$/, "") + ".txt";
    
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
      
      set({ isSaving: false });
      return response.ok;
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
  }
}));
