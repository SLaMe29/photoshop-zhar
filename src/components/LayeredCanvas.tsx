import { useRef, useEffect, useState, useCallback } from 'react';
import type { MouseEvent } from 'react';
import { useEditor } from '@/context/EditorContext';
import { getAllColorSpaces, rgbToHex } from '@/lib/colorSpaces';
import type { RGB } from '@/lib/colorSpaces';
import { blendLayers } from '@/lib/blendModes';

interface LayeredCanvasProps {
  zoomLevel: number;
  onZoomChange?: (newZoom: number) => void;
}

export function LayeredCanvas({ zoomLevel, onZoomChange }: LayeredCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  
  const {
    activeTool,
    setPrimaryColor,
    setSecondaryColor,
    layers,
    activeLayerId
  } = useEditor();
  
  // Вычисляем размеры canvas на основе слоев
  const calculateCanvasSize = useCallback(() => {
    if (layers.length === 0) {
      return { width: 800, height: 600 };
    }
    
    let maxWidth = 0;
    let maxHeight = 0;
    
    layers.forEach(layer => {
      if (layer.imageData) {
        maxWidth = Math.max(maxWidth, layer.imageData.width);
        maxHeight = Math.max(maxHeight, layer.imageData.height);
      }
    });
    
    return { width: maxWidth || 800, height: maxHeight || 600 };
  }, [layers]);
  
  // Обновляем размеры canvas при изменении слоев
  useEffect(() => {
    const newSize = calculateCanvasSize();
    setCanvasSize(newSize);
  }, [calculateCanvasSize]);
  
  // Отдельный эффект для автоматического масштабирования только при первой загрузке
  useEffect(() => {
    if (layers.length === 1 && containerRef.current && canvasSize.width > 0 && canvasSize.height > 0) {
      const container = containerRef.current;
      const containerWidth = container.clientWidth - 100; // 50px отступы
      const containerHeight = container.clientHeight - 100;
      
      const widthRatio = containerWidth / canvasSize.width;
      const heightRatio = containerHeight / canvasSize.height;
      const fitRatio = Math.min(widthRatio, heightRatio);
      
      // Устанавливаем масштаб от 25% до 200%
      const newZoomLevel = Math.max(25, Math.min(200, Math.floor(fitRatio * 100)));
      
      // Передаем новый зум в родительский компонент только при первой загрузке
      if (onZoomChange) {
        onZoomChange(newZoomLevel);
      }
      
      // Центрируем изображение
      setImageOffset({ x: 0, y: 0 });
    }
  }, [layers.length, canvasSize.width, canvasSize.height]); // Убираем zoomLevel из зависимостей
  
  // Функция для отрисовки всех слоев
  const drawLayers = useCallback(() => {
    if (!canvasRef.current || layers.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Очищаем canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Фильтруем видимые слои
    const visibleLayers = layers.filter(layer => layer.visible && layer.imageData);
    if (visibleLayers.length === 0) return;
    
    // Вычисляем масштабированные размеры
    const scaleFactor = zoomLevel / 100;
    const scaledWidth = canvasSize.width * scaleFactor;
    const scaledHeight = canvasSize.height * scaleFactor;
    
    // Вычисляем позицию для центрирования изображения
    const centerX = (canvas.width - scaledWidth) / 2 + imageOffset.x;
    const centerY = (canvas.height - scaledHeight) / 2 + imageOffset.y;
    
    ctx.imageSmoothingEnabled = zoomLevel <= 100;
    
    // Оптимизация: если только один слой, рисуем его напрямую
    if (visibleLayers.length === 1) {
      const layer = visibleLayers[0];
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasSize.width;
      tempCanvas.height = canvasSize.height;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (tempCtx && layer.imageData) {
        tempCtx.putImageData(layer.imageData, 0, 0);
        
        // Применяем непрозрачность
        ctx.globalAlpha = layer.opacity / 100;
        ctx.drawImage(tempCanvas, centerX, centerY, scaledWidth, scaledHeight);
        ctx.globalAlpha = 1;
      }
    } else {
      // Для нескольких слоев используем смешивание
      const layersToBlend = visibleLayers.map(layer => ({
        imageData: layer.imageData!,
        blendMode: layer.blendMode,
        opacity: layer.opacity,
        visible: layer.visible
      }));
      
      // Смешиваем слои
      const blendedImage = blendLayers(layersToBlend, canvasSize.width, canvasSize.height);
      
      // Создаем временный canvas для отрисовки смешанного изображения
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasSize.width;
      tempCanvas.height = canvasSize.height;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (tempCtx) {
        tempCtx.putImageData(blendedImage, 0, 0);
        ctx.drawImage(tempCanvas, centerX, centerY, scaledWidth, scaledHeight);
      }
    }
  }, [layers, canvasSize, zoomLevel, imageOffset]);

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
      drawLayers();
    };
    
    resizeCanvas();
    
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);
    
    return () => resizeObserver.disconnect();
  }, [drawLayers]);
  
  
  // Перерисовываем при изменении слоев или зума
  useEffect(() => {
    drawLayers();
  }, [drawLayers]);
  
  // Обработка клавиш стрелок для перемещения изображения
  useEffect(() => {
    if (activeTool !== 'hand') return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const step = 10;
      
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
  
  // Обработка перетаскивания
  useEffect(() => {
    if (!isDragging) return;
    
    const handleDocumentMouseMove = (e: globalThis.MouseEvent) => {
      if (activeTool !== 'hand') return;
      
      e.preventDefault();
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
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
  
  // Обработчики мыши
  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'hand') {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };
  
  // Обработчик для инструмента пипетки
  const handleCanvasClick = (e: MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'eyedropper' || !canvasRef.current || layers.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    // Вычисляем масштабированные размеры и позицию
    const scaleFactor = zoomLevel / 100;
    const scaledWidth = canvasSize.width * scaleFactor;
    const scaledHeight = canvasSize.height * scaleFactor;
    const centerX = (canvas.width - scaledWidth) / 2 + imageOffset.x;
    const centerY = (canvas.height - scaledHeight) / 2 + imageOffset.y;
    
    // Проверяем, что клик внутри изображения
    if (canvasX >= centerX && canvasX <= centerX + scaledWidth &&
        canvasY >= centerY && canvasY <= centerY + scaledHeight) {
      
      // Конвертируем координаты canvas в координаты изображения
      const imageX = Math.floor((canvasX - centerX) / scaleFactor);
      const imageY = Math.floor((canvasY - centerY) / scaleFactor);
      
      // Получаем цвет из активного слоя или смешанного изображения
      const activeLayer = layers.find(layer => layer.id === activeLayerId);
      let pixelData: Uint8ClampedArray | null = null;
      
      if (activeLayer && activeLayer.imageData) {
        const pixelIndex = (imageY * activeLayer.imageData.width + imageX) * 4;
        if (pixelIndex >= 0 && pixelIndex < activeLayer.imageData.data.length) {
          pixelData = activeLayer.imageData.data.slice(pixelIndex, pixelIndex + 4);
        }
      }
      
      if (pixelData) {
        const rgb: RGB = {
          r: pixelData[0],
          g: pixelData[1],
          b: pixelData[2]
        };
        
        const allSpaces = getAllColorSpaces(rgb);
        
        const colorInfo = {
          rgb,
          coordinates: { x: imageX, y: imageY },
          hex: rgbToHex(rgb),
          allSpaces
        };
        
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
      
      {layers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p className="text-lg mb-2">Нет слоев</p>
            <p className="text-sm">Добавьте слой в панели слоев</p>
          </div>
        </div>
      )}
    </div>
  );
}