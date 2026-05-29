import React, { useRef, useState, useEffect } from 'react';
import { useLabelStore } from '../store/useLabelStore';

function BoundingBoxCanvas() {
  const { boxes, addBox, selectedClassId } = useLabelStore();
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });

  const getCanvasCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    const pos = getCanvasCoords(e);
    setStartPos(pos);
    setCurrentPos(pos);
    setIsDrawing(true);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    setCurrentPos(getCanvasCoords(e));
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvasWidth = canvasRef.current.clientWidth;
    const canvasHeight = canvasRef.current.clientHeight;

    const minX = Math.min(startPos.x, currentPos.x);
    const minY = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    if (width < 5 || height < 5) return;

    // Convert to YOLO format
    const xCenter = (minX + width / 2) / canvasWidth;
    const yCenter = (minY + height / 2) / canvasHeight;
    const normWidth = width / canvasWidth;
    const normHeight = height / canvasHeight;

    addBox({
      classId: selectedClassId,
      xCenter,
      yCenter,
      width: normWidth,
      height: normHeight
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Resize internal resolution to match CSS display size
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw existing boxes
    boxes.forEach(box => {
      const x = (box.xCenter - box.width / 2) * canvas.width;
      const y = (box.yCenter - box.height / 2) * canvas.height;
      const w = box.width * canvas.width;
      const h = box.height * canvas.height;

      ctx.strokeStyle = '#10b981'; // emerald-500
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.fillRect(x, y, w, h);
    });

    // 2. Draw current box being drawn
    if (isDrawing) {
      const minX = Math.min(startPos.x, currentPos.x);
      const minY = Math.min(startPos.y, currentPos.y);
      const w = Math.abs(currentPos.x - startPos.x);
      const h = Math.abs(currentPos.y - startPos.y);

      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = '#a78bfa'; // violet-400
      ctx.lineWidth = 2;
      ctx.strokeRect(minX, minY, w, h);
      ctx.setLineDash([]); 
      
      ctx.fillStyle = 'rgba(167, 139, 250, 0.15)';
      ctx.fillRect(minX, minY, w, h);
    }
  }, [boxes, isDrawing, startPos, currentPos]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full cursor-crosshair touch-none z-10"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
}

export default BoundingBoxCanvas;
