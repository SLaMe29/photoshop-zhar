import { useEffect } from 'react';
import { useEditor } from '@/context/EditorContext';

/**
 * Хук для автоматического создания слоя из загруженного изображения
 */
export function useImageToLayer(imageUrl: string | null) {
  const { addLayer, layers } = useEditor();
  
  useEffect(() => {
    if (!imageUrl) return;
    
    // Проверяем, есть ли уже слой с таким изображением или похожим URL
    const existingLayer = layers.find(layer =>
      layer.imageUrl === imageUrl ||
      (layer.imageUrl && layer.imageUrl.startsWith('data:image/png;base64') && imageUrl.startsWith('data:image/png;base64'))
    );
    if (existingLayer) return;
    
    // Создаем изображение и загружаем его
    const img = new Image();
    img.onload = () => {
      let finalImageData: ImageData;
      let canvas: HTMLCanvasElement;
      let ctx: CanvasRenderingContext2D | null;
      
      // Если это первый слой, используем оригинальные размеры
      if (layers.length === 0) {
        canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          finalImageData = ctx.getImageData(0, 0, img.width, img.height);
        } else {
          return;
        }
      } else {
        // Если есть другие слои, центрируем относительно первого слоя
        const firstLayer = layers[0];
        if (firstLayer.imageData) {
          const baseWidth = firstLayer.imageData.width;
          const baseHeight = firstLayer.imageData.height;
          
          canvas = document.createElement('canvas');
          canvas.width = baseWidth;
          canvas.height = baseHeight;
          ctx = canvas.getContext('2d');
          
          if (ctx) {
            // Вычисляем позицию для центрирования
            const offsetX = (baseWidth - img.width) / 2;
            const offsetY = (baseHeight - img.height) / 2;
            
            // Рисуем изображение по центру
            ctx.drawImage(img, offsetX, offsetY);
            finalImageData = ctx.getImageData(0, 0, baseWidth, baseHeight);
          } else {
            return;
          }
        } else {
          // Fallback к оригинальным размерам
          canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            finalImageData = ctx.getImageData(0, 0, img.width, img.height);
          } else {
            return;
          }
        }
      }
      
      // Создаем новый слой
      addLayer({
        name: layers.length === 0 ? 'Фон' : `Слой ${layers.length + 1}`,
        visible: true,
        opacity: 100,
        blendMode: 'normal',
        imageData: finalImageData,
        imageUrl,
        isBackground: layers.length === 0
      });
    };
    
    img.onerror = () => {
      console.error('Не удалось загрузить изображение для создания слоя:', imageUrl);
    };
    
    img.src = imageUrl;
  }, [imageUrl, addLayer, layers]);
}