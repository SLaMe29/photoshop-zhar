import React from 'react';
import { cn } from '@/lib/utils';
import { ZoomControls } from './ZoomControls';
import { useEditor } from '@/context/EditorContext';

interface ImageInfoProps {
  zoomLevel: number;
  onZoomChange: (newZoom: number) => void;
}

export function ImageInfo({ zoomLevel, onZoomChange }: ImageInfoProps) {
  const { layers, activeLayerId } = useEditor();
  
  // Получаем активный слой
  const activeLayer = layers.find(layer => layer.id === activeLayerId);
  
  // Вычисляем общие размеры canvas на основе всех слоев
  const canvasInfo = React.useMemo(() => {
    if (layers.length === 0) return null;
    
    let maxWidth = 0;
    let maxHeight = 0;
    
    layers.forEach(layer => {
      if (layer.imageData) {
        maxWidth = Math.max(maxWidth, layer.imageData.width);
        maxHeight = Math.max(maxHeight, layer.imageData.height);
      }
    });
    
    return {
      width: maxWidth,
      height: maxHeight,
      layersCount: layers.length,
      activeLayerName: activeLayer?.name || 'Нет'
    };
  }, [layers, activeLayer]);
  
  return (
    <footer className={cn(
      "p-2 border-t bg-muted text-sm flex justify-between items-center min-w-0",
      canvasInfo ? "text-foreground" : "text-muted-foreground"
    )}>
      {canvasInfo ? (
        <>
          <div className="flex gap-4 flex-shrink-0">
            <span>Размер: {canvasInfo.width}×{canvasInfo.height}px</span>
            <span>Слоев: {canvasInfo.layersCount}</span>
            <span>Активный: {canvasInfo.activeLayerName}</span>
          </div>
          
          <div className="flex-shrink-0 ml-4">
            <ZoomControls
              zoomLevel={zoomLevel}
              onZoomChange={onZoomChange}
            />
          </div>
        </>
      ) : (
        <>
          <span>Нет слоев</span>
          <div className="flex-shrink-0 ml-4">
            <ZoomControls
              zoomLevel={zoomLevel}
              onZoomChange={onZoomChange}
            />
          </div>
        </>
      )}
    </footer>
  );
}