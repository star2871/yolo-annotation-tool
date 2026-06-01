import React, { useRef, useState, useEffect } from 'react';
import { useLabelStore } from '../store/useLabelStore';

function BoundingBoxCanvas() {
  const { boxes, addBox, updateBox, selectedClassId, toolMode, selectedBoxIndex, setSelectedBoxIndex, removeBox } = useLabelStore();
  const canvasRef = useRef(null);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  
  // Interaction state
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  
  // Resizing / Dragging state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null); // 'TL', 'TR', 'BL', 'BR'
  const [isDragging, setIsDragging] = useState(false);
  const [interactionStartBox, setInteractionStartBox] = useState(null);

  const HANDLE_SIZE = 8;
  const HANDLE_HIT_AREA = 12;

  // Handle keyboard delete
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (toolMode === 'select' && selectedBoxIndex !== null) {
          e.preventDefault();
          removeBox(selectedBoxIndex);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toolMode, selectedBoxIndex, removeBox]);

  const getCanvasCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const getBoxPx = (box, canvasWidth, canvasHeight) => {
    const minX = (box.xCenter - box.width / 2) * canvasWidth;
    const minY = (box.yCenter - box.height / 2) * canvasHeight;
    const maxX = minX + box.width * canvasWidth;
    const maxY = minY + box.height * canvasHeight;
    return { minX, minY, maxX, maxY };
  };

  const checkHandleHit = (pos, boxPx) => {
    const { minX, minY, maxX, maxY } = boxPx;
    const hit = (x, y) => Math.abs(pos.x - x) <= HANDLE_HIT_AREA && Math.abs(pos.y - y) <= HANDLE_HIT_AREA;
    
    if (hit(minX, minY)) return 'TL';
    if (hit(maxX, minY)) return 'TR';
    if (hit(minX, maxY)) return 'BL';
    if (hit(maxX, maxY)) return 'BR';
    return null;
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    const pos = getCanvasCoords(e);
    const canvas = canvasRef.current;
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;
    
    if (toolMode === 'select') {
      // 1. Check if clicking on handles of the currently selected box
      if (selectedBoxIndex !== null && boxes[selectedBoxIndex]) {
        const boxPx = getBoxPx(boxes[selectedBoxIndex], canvasWidth, canvasHeight);
        const handle = checkHandleHit(pos, boxPx);
        if (handle) {
          setIsResizing(true);
          setResizeHandle(handle);
          setStartPos(pos);
          setInteractionStartBox({ ...boxes[selectedBoxIndex] });
          return;
        }
      }

      // 2. Check if clicking inside any box
      let clickedBoxIndex = null;
      for (let i = boxes.length - 1; i >= 0; i--) {
        const { minX, minY, maxX, maxY } = getBoxPx(boxes[i], canvasWidth, canvasHeight);
        if (pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY) {
          clickedBoxIndex = i;
          break;
        }
      }
      
      setSelectedBoxIndex(clickedBoxIndex);
      
      // If clicked inside a box, start dragging
      if (clickedBoxIndex !== null) {
        setIsDragging(true);
        setStartPos(pos);
        setInteractionStartBox({ ...boxes[clickedBoxIndex] });
      }
    } else if (toolMode === 'draw') {
      setStartPos(pos);
      setCurrentPos(pos);
      setIsDrawing(true);
    }
  };

  const handleMouseMove = (e) => {
    const pos = getCanvasCoords(e);
    setCurrentPos(pos);

    if (isResizing && interactionStartBox && selectedBoxIndex !== null) {
      const canvasWidth = canvasRef.current.clientWidth;
      const canvasHeight = canvasRef.current.clientHeight;
      
      const dx = (pos.x - startPos.x) / canvasWidth;
      const dy = (pos.y - startPos.y) / canvasHeight;

      let newMinX = interactionStartBox.xCenter - interactionStartBox.width / 2;
      let newMinY = interactionStartBox.yCenter - interactionStartBox.height / 2;
      let newMaxX = interactionStartBox.xCenter + interactionStartBox.width / 2;
      let newMaxY = interactionStartBox.yCenter + interactionStartBox.height / 2;

      if (resizeHandle === 'TL') { newMinX += dx; newMinY += dy; }
      else if (resizeHandle === 'TR') { newMaxX += dx; newMinY += dy; }
      else if (resizeHandle === 'BL') { newMinX += dx; newMaxY += dy; }
      else if (resizeHandle === 'BR') { newMaxX += dx; newMaxY += dy; }

      // Prevent negative width/height (or flipping)
      if (newMaxX < newMinX) newMaxX = newMinX + 0.001;
      if (newMaxY < newMinY) newMaxY = newMinY + 0.001;

      updateBox(selectedBoxIndex, {
        xCenter: (newMinX + newMaxX) / 2,
        yCenter: (newMinY + newMaxY) / 2,
        width: newMaxX - newMinX,
        height: newMaxY - newMinY
      });
    } else if (isDragging && interactionStartBox && selectedBoxIndex !== null) {
      const canvasWidth = canvasRef.current.clientWidth;
      const canvasHeight = canvasRef.current.clientHeight;
      
      const dx = (pos.x - startPos.x) / canvasWidth;
      const dy = (pos.y - startPos.y) / canvasHeight;

      updateBox(selectedBoxIndex, {
        xCenter: interactionStartBox.xCenter + dx,
        yCenter: interactionStartBox.yCenter + dy
      });
    }
  };

  const handleMouseUp = () => {
    if (isResizing) setIsResizing(false);
    if (isDragging) setIsDragging(false);
    
    if (isDrawing) {
      setIsDrawing(false);
      const canvasWidth = canvasRef.current.clientWidth;
      const canvasHeight = canvasRef.current.clientHeight;

      const minX = Math.min(startPos.x, currentPos.x);
      const minY = Math.min(startPos.y, currentPos.y);
      const width = Math.abs(currentPos.x - startPos.x);
      const height = Math.abs(currentPos.y - startPos.y);

      if (width >= 5 && height >= 5) {
        addBox({
          classId: selectedClassId,
          xCenter: (minX + width / 2) / canvasWidth,
          yCenter: (minY + height / 2) / canvasHeight,
          width: width / canvasWidth,
          height: height / canvasHeight
        });
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw existing boxes
    boxes.forEach((box, index) => {
      const { minX, minY, maxX, maxY } = getBoxPx(box, canvas.width, canvas.height);
      const w = maxX - minX;
      const h = maxY - minY;
      
      const isSelected = index === selectedBoxIndex;
      const classLabel = useLabelStore.getState().classes[box.classId] || 'Unknown';

      if (isSelected) {
        ctx.strokeStyle = '#eab308'; // yellow-500
        ctx.lineWidth = 3;
        ctx.strokeRect(minX, minY, w, h);
        ctx.fillStyle = 'rgba(234, 179, 8, 0.15)';
        ctx.fillRect(minX, minY, w, h);
        
        // Draw corner handles
        ctx.fillStyle = '#eab308';
        const halfHandle = HANDLE_SIZE / 2;
        ctx.fillRect(minX - halfHandle, minY - halfHandle, HANDLE_SIZE, HANDLE_SIZE); // TL
        ctx.fillRect(maxX - halfHandle, minY - halfHandle, HANDLE_SIZE, HANDLE_SIZE); // TR
        ctx.fillRect(minX - halfHandle, maxY - halfHandle, HANDLE_SIZE, HANDLE_SIZE); // BL
        ctx.fillRect(maxX - halfHandle, maxY - halfHandle, HANDLE_SIZE, HANDLE_SIZE); // BR
      } else {
        ctx.strokeStyle = '#10b981'; // emerald-500
        ctx.lineWidth = 2;
        ctx.strokeRect(minX, minY, w, h);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
        ctx.fillRect(minX, minY, w, h);
      }
      
      // Draw Class Label Text
      ctx.font = '12px Inter, sans-serif';
      const textWidth = ctx.measureText(classLabel).width;
      const padding = 4;
      const labelHeight = 18;
      
      // Background for text
      ctx.fillStyle = isSelected ? '#eab308' : '#10b981';
      ctx.fillRect(minX - (isSelected ? 1.5 : 1), minY - labelHeight, textWidth + padding * 2, labelHeight);
      
      // Text
      ctx.fillStyle = '#000000'; // dark text for contrast
      ctx.fillText(classLabel, minX + padding - (isSelected ? 1.5 : 1), minY - 5);
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
  }, [boxes, isDrawing, startPos, currentPos, selectedBoxIndex]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full z-10 ${toolMode === 'draw' ? 'cursor-crosshair' : (isResizing || isDragging ? 'cursor-grabbing' : 'cursor-default')}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
}

export default BoundingBoxCanvas;
