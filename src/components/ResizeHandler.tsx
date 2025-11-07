import { useEditor } from '@/context/EditorContext';
import { ResizeModal } from '@/components/ResizeModal';
import { resizeImage } from '@/lib/interpolation';

interface ResizeHandlerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onError: (error: string) => void;
}

export function ResizeHandler({ open, onOpenChange, onError }: ResizeHandlerProps) {
  const { layers, updateLayer } = useEditor();
  
  // Handle resize for all layers (resize canvas)
  const handleResize = (width: number, height: number, method: 'nearest' | 'bilinear') => {
    if (layers.length === 0) {
      onError('Нет слоев для изменения размера');
      return;
    }
    
    // Check if dimensions are reasonable
    const maxSize = 8192;
    if (width > maxSize || height > maxSize) {
      onError(`Размер изображения слишком большой. Максимальный размер: ${maxSize}x${maxSize}`);
      return;
    }
    
    try {
      // Resize all layers
      layers.forEach(layer => {
        if (layer.imageData) {
          const resizedData = resizeImage(
            layer.imageData,
            layer.imageData.width,
            layer.imageData.height,
            width,
            height,
            method
          );
          
          // Create new image URL
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.putImageData(resizedData, 0, 0);
            const newImageUrl = canvas.toDataURL('image/png');
            
            // Update the layer
            updateLayer(layer.id, {
              imageData: resizedData,
              imageUrl: newImageUrl
            });
          }
        }
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Ошибка при изменении размера:', error);
      onError('Не удалось изменить размер слоев');
    }
  };
  
  // Используем размеры первого слоя как базовые
  const baseLayer = layers[0];
  if (!baseLayer || !baseLayer.imageData) {
    return null;
  }
  
  return (
    <ResizeModal
      open={open}
      onOpenChange={onOpenChange}
      onResize={handleResize}
      originalWidth={baseLayer.imageData.width}
      originalHeight={baseLayer.imageData.height}
    />
  );
}