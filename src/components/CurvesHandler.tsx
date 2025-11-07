import { useState } from 'react';
import { useEditor } from '@/context/EditorContext';
import { CurvesModal } from '@/components/CurvesModal';

interface CurvesHandlerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onError: (error: string) => void;
}

export function CurvesHandler({ open, onOpenChange, onError }: CurvesHandlerProps) {
  const { layers, activeLayerId, updateLayer, alphaChannels } = useEditor();
  const [isAlphaMode] = useState(false);
  
  // Get active layer
  const activeLayer = layers.find(layer => layer.id === activeLayerId);
  
  // Check if we have alpha channels and determine mode
  const hasAlphaChannels = alphaChannels.length > 0;
  const shouldShowAlphaMode = hasAlphaChannels && isAlphaMode;
  
  // Get image data for processing
  const getImageData = (): ImageData | null => {
    if (!activeLayer?.imageData) return null;
    
    if (shouldShowAlphaMode) {
      // For alpha channel mode, we need to create ImageData with alpha channel data
      const alphaChannel = alphaChannels[0]; // Use first alpha channel
      if (!alphaChannel) return null;
      
      const { width, height, data } = alphaChannel;
      const imageData = new ImageData(width, height);
      
      // Fill with alpha data (convert single channel to RGBA)
      for (let i = 0; i < data.length; i++) {
        const pixelIndex = i * 4;
        const alphaValue = data[i];
        imageData.data[pixelIndex] = alphaValue;     // R
        imageData.data[pixelIndex + 1] = alphaValue; // G
        imageData.data[pixelIndex + 2] = alphaValue; // B
        imageData.data[pixelIndex + 3] = 255;        // A (full opacity for display)
      }
      
      return imageData;
    }
    
    return activeLayer.imageData;
  };
  
  const handleApply = (correctedImageData: ImageData) => {
    if (!activeLayer) {
      onError('Нет активного слоя для применения коррекции');
      return;
    }
    
    try {
      if (shouldShowAlphaMode) {
        // Update alpha channel
        const alphaChannel = alphaChannels[0];
        if (!alphaChannel) {
          onError('Нет альфа-канала для обновления');
          return;
        }
        
        // Extract alpha values from corrected image data
        const newAlphaData = new Uint8ClampedArray(alphaChannel.data.length);
        for (let i = 0; i < newAlphaData.length; i++) {
          newAlphaData[i] = correctedImageData.data[i * 4 + 3]; // Extract alpha channel
        }
        
        // Update alpha channel (this would need to be implemented in context)
        // For now, we'll show an error as alpha channel updates aren't fully implemented
        onError('Обновление альфа-каналов пока не реализовано');
        return;
      } else {
        // Update layer image data
        const canvas = document.createElement('canvas');
        canvas.width = correctedImageData.width;
        canvas.height = correctedImageData.height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.putImageData(correctedImageData, 0, 0);
          const newImageUrl = canvas.toDataURL('image/png');
          
          updateLayer(activeLayer.id, {
            imageData: correctedImageData,
            imageUrl: newImageUrl
          });
        }
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error applying curves correction:', error);
      onError('Не удалось применить градационную коррекцию');
    }
  };
  
  // Don't render if no active layer
  if (!activeLayer) {
    return null;
  }
  
  const imageData = getImageData();
  
  return (
    <CurvesModal
      open={open}
      onOpenChange={onOpenChange}
      onApply={handleApply}
      imageData={imageData}
      isAlphaChannel={shouldShowAlphaMode}
    />
  );
}