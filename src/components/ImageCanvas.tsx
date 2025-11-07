import React, { useRef, useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { useEditor } from '@/context/EditorContext';
import { getAllColorSpaces, rgbToHex } from '@/lib/colorSpaces';
import type { RGB } from '@/lib/colorSpaces';

interface ImageCanvasProps {
  imageUrl: string | null;
  zoomLevel: number;
  metadata: {
    width: number;
    height: number;
  } | null;
  onImageLoad?: (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, img: HTMLImageElement) => void;
  onImageError?: (error: Error) => void;
  onZoomChange?: (newZoom: number) => void;
}

export function ImageCanvas({ imageUrl, zoomLevel, metadata, onImageLoad, onImageError, onZoomChange }: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  
  const {
    activeTool,
    setPrimaryColor,
    setSecondaryColor
  } = useEditor();
  
  // Resize canvas to fill container
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      
      // Redraw image after resize
      drawImage();
    };
    
    resizeCanvas();
    
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);
    
    return () => resizeObserver.disconnect();
  }, []);

  // Load image when imageUrl changes
  useEffect(() => {
    if (!imageUrl) {
      setLoadedImage(null);
      return;
    }
    
    const img = new Image();
    
    img.onload = () => {
      const isFirstLoad = !loadedImage; // Check if this is the first image load
      setLoadedImage(img);
      
      // Calculate initial zoom to fit image with 50px margins ONLY on first load
      if (isFirstLoad && onZoomChange && containerRef.current) {
        const container = containerRef.current;
        const containerWidth = container.clientWidth - 100; // 50px margins
        const containerHeight = container.clientHeight - 100;
        
        const widthRatio = containerWidth / img.width;
        const heightRatio = containerHeight / img.height;
        const fitRatio = Math.min(widthRatio, heightRatio);
        
        const newZoomLevel = Math.max(12, Math.min(300, Math.floor(fitRatio * 100)));
        onZoomChange(newZoomLevel);
      }
      
      // Call the onImageLoad callback if provided
      if (onImageLoad && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          onImageLoad(canvas, ctx, img);
        }
      }
      
      // Center image only on first load
      if (isFirstLoad) {
        setImageOffset({ x: 0, y: 0 });
      }
    };
    
    img.onerror = () => {
      if (onImageError) {
        onImageError(new Error('Не удалось загрузить изображение'));
      }
    };
    
    img.src = imageUrl;
  }, [imageUrl, onImageLoad, onImageError, onZoomChange, loadedImage]);

  // Function to draw image on canvas
  const drawImage = React.useCallback(() => {
    if (!canvasRef.current || !loadedImage || !metadata) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate scaled dimensions
    const scaleFactor = zoomLevel / 100;
    const scaledWidth = metadata.width * scaleFactor;
    const scaledHeight = metadata.height * scaleFactor;
    
    // Calculate position to center image
    const centerX = (canvas.width - scaledWidth) / 2 + imageOffset.x;
    const centerY = (canvas.height - scaledHeight) / 2 + imageOffset.y;
    
    // Draw image
    ctx.imageSmoothingEnabled = zoomLevel <= 100;
    ctx.drawImage(loadedImage, centerX, centerY, scaledWidth, scaledHeight);
  }, [loadedImage, metadata, zoomLevel, imageOffset]);

  // Redraw when zoom level or offset changes
  useEffect(() => {
    drawImage();
  }, [drawImage]);
  
  // Обработка клавиш стрелок для перемещения изображения
  useEffect(() => {
    if (activeTool !== 'hand') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const step = 10; // Шаг перемещения в пикселях
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setImageOffset(prev => ({ x: prev.x, y: prev.y + step }));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setImageOffset(prev => ({ x: prev.x, y: prev.y - step }));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setImageOffset(prev => ({ x: prev.x + step, y: prev.y }));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setImageOffset(prev => ({ x: prev.x - step, y: prev.y }));
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool]);
  
  // Обработка перетаскивания на уровне документа
  useEffect(() => {
    if (!isDragging) return;
    
    const handleDocumentMouseMove = (e: globalThis.MouseEvent) => {
      if (activeTool !== 'hand') return;
      
      e.preventDefault();
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      // Обновляем позицию изображения
      setImageOffset(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));
      
      setDragStart({ x: e.clientX, y: e.clientY });
    };
    
    const handleDocumentMouseUp = () => {
      setIsDragging(false);
    };
    
    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [isDragging, activeTool, dragStart]);
  
  // Обработчики для инструментов
  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'hand') {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  // Обработчик для инструмента пипетки
  const handleCanvasClick = (e: MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'eyedropper' || !canvasRef.current || !metadata || !loadedImage) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    // Calculate scaled dimensions and position
    const scaleFactor = zoomLevel / 100;
    const scaledWidth = metadata.width * scaleFactor;
    const scaledHeight = metadata.height * scaleFactor;
    const centerX = (canvas.width - scaledWidth) / 2 + imageOffset.x;
    const centerY = (canvas.height - scaledHeight) / 2 + imageOffset.y;
    
    // Check if click is within image bounds
    if (canvasX >= centerX && canvasX <= centerX + scaledWidth &&
        canvasY >= centerY && canvasY <= centerY + scaledHeight) {
      
      // Convert canvas coordinates to image coordinates
      const imageX = Math.floor((canvasX - centerX) / scaleFactor);
      const imageY = Math.floor((canvasY - centerY) / scaleFactor);
      
      // Create a temporary canvas to get pixel data from original image
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = metadata.width;
      tempCanvas.height = metadata.height;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (tempCtx) {
        tempCtx.drawImage(loadedImage, 0, 0);
        const pixelData = tempCtx.getImageData(imageX, imageY, 1, 1).data;
        
        // Создаем объект RGB
        const rgb: RGB = {
          r: pixelData[0],
          g: pixelData[1],
          b: pixelData[2]
        };
        
        // Получаем все представления цвета
        const allSpaces = getAllColorSpaces(rgb);
        
        // Создаем объект с информацией о цвете
        const colorInfo = {
          rgb,
          coordinates: { x: imageX, y: imageY },
          hex: rgbToHex(rgb),
          allSpaces
        };
        
        // Определяем, какой цвет устанавливать (основной или дополнительный)
        if (e.altKey || e.ctrlKey || e.shiftKey) {
          setSecondaryColor(colorInfo);
        } else {
          setPrimaryColor(colorInfo);
        }
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{
        minWidth: 0,
        minHeight: 0
      }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          cursor: activeTool === 'hand' ? (isDragging ? 'grabbing' : 'grab') :
                  activeTool === 'eyedropper' ? 'crosshair' : 'default',
          imageRendering: zoomLevel > 100 ? 'pixelated' : 'auto'
        }}
        onMouseDown={handleMouseDown}
        onClick={handleCanvasClick}
      />
    </div>
  );
}