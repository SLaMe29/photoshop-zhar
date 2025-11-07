import { FilterModal } from './FilterModal';
import { useEditor, type Layer } from '@/context/EditorContext';
import { applyKernelFilter, applyMedianFilter, applyGaussianBlur, applyLaplacianFilter, type Kernel } from '@/lib/filters';
import { shouldUseWorker, getGlobalWorkerPool, type FilterWorkerMessage } from '@/lib/filterWorker';

interface FilterHandlerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onError: (error: string) => void;
}

export function FilterHandler({ open, onOpenChange, onError }: FilterHandlerProps) {
  const { layers, activeLayerId, updateLayer } = useEditor();

  const handleApplyFilter = async (kernel: Kernel) => {
    if (!activeLayerId) {
      onError('Нет активного слоя для применения фильтра');
      return;
    }

    const activeLayer = layers.find(layer => layer.id === activeLayerId);
    if (!activeLayer || !activeLayer.imageData) {
      onError('Активный слой не содержит данных изображения');
      return;
    }

    try {
      let filteredImageData: ImageData;

      // Проверяем, нужно ли использовать Web Worker для больших изображений
      if (shouldUseWorker(activeLayer.imageData)) {
        try {
          const workerPool = getGlobalWorkerPool();
          const message: FilterWorkerMessage = {
            type: 'APPLY_KERNEL_FILTER',
            imageData: activeLayer.imageData,
            params: { kernel }
          };
          
          filteredImageData = await workerPool.applyFilter(message);
        } catch (workerError) {
          console.warn('Ошибка Web Worker, используем основной поток:', workerError);
          // Fallback к основному потоку
          filteredImageData = applyKernelFilter(activeLayer.imageData, kernel);
        }
      } else {
        // Для небольших изображений используем основной поток
        filteredImageData = applyKernelFilter(activeLayer.imageData, kernel);
      }
      
      // Обновляем слой с отфильтрованными данными
      updateLayer(activeLayerId, {
        imageData: filteredImageData
      });

      onOpenChange(false);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Ошибка применения фильтра');
    }
  };

  return (
    <FilterModal
      open={open}
      onOpenChange={onOpenChange}
      onApply={handleApplyFilter}
      onError={onError}
    />
  );
}

// Дополнительные функции для применения других типов фильтров
export async function applyMedianFilterToLayer(
  layers: Layer[],
  activeLayerId: string | null,
  updateLayer: (id: string, updates: Partial<Layer>) => void,
  onError: (error: string) => void,
  kernelSize: number = 3
) {
  if (!activeLayerId) {
    onError('Нет активного слоя для применения фильтра');
    return;
  }

  const activeLayer = layers.find(layer => layer.id === activeLayerId);
  if (!activeLayer || !activeLayer.imageData) {
    onError('Активный слой не содержит данных изображения');
    return;
  }

  try {
    let filteredImageData: ImageData;

    if (shouldUseWorker(activeLayer.imageData)) {
      try {
        const workerPool = getGlobalWorkerPool();
        const message: FilterWorkerMessage = {
          type: 'APPLY_MEDIAN_FILTER',
          imageData: activeLayer.imageData,
          params: { kernelSize }
        };
        
        filteredImageData = await workerPool.applyFilter(message);
      } catch (workerError) {
        console.warn('Ошибка Web Worker, используем основной поток:', workerError);
        filteredImageData = applyMedianFilter(activeLayer.imageData, kernelSize);
      }
    } else {
      filteredImageData = applyMedianFilter(activeLayer.imageData, kernelSize);
    }

    updateLayer(activeLayerId, { imageData: filteredImageData });
  } catch (error) {
    onError(error instanceof Error ? error.message : 'Ошибка применения медианного фильтра');
  }
}

export async function applyGaussianBlurToLayer(
  layers: Layer[],
  activeLayerId: string | null,
  updateLayer: (id: string, updates: Partial<Layer>) => void,
  onError: (error: string) => void,
  sigma: number = 1.0
) {
  if (!activeLayerId) {
    onError('Нет активного слоя для применения фильтра');
    return;
  }

  const activeLayer = layers.find(layer => layer.id === activeLayerId);
  if (!activeLayer || !activeLayer.imageData) {
    onError('Активный слой не содержит данных изображения');
    return;
  }

  try {
    let filteredImageData: ImageData;

    if (shouldUseWorker(activeLayer.imageData)) {
      try {
        const workerPool = getGlobalWorkerPool();
        const message: FilterWorkerMessage = {
          type: 'APPLY_GAUSSIAN_BLUR',
          imageData: activeLayer.imageData,
          params: { sigma }
        };
        
        filteredImageData = await workerPool.applyFilter(message);
      } catch (workerError) {
        console.warn('Ошибка Web Worker, используем основной поток:', workerError);
        filteredImageData = applyGaussianBlur(activeLayer.imageData, sigma);
      }
    } else {
      filteredImageData = applyGaussianBlur(activeLayer.imageData, sigma);
    }

    updateLayer(activeLayerId, { imageData: filteredImageData });
  } catch (error) {
    onError(error instanceof Error ? error.message : 'Ошибка применения размытия по Гауссу');
  }
}

export async function applyLaplacianFilterToLayer(
  layers: Layer[],
  activeLayerId: string | null,
  updateLayer: (id: string, updates: Partial<Layer>) => void,
  onError: (error: string) => void
) {
  if (!activeLayerId) {
    onError('Нет активного слоя для применения фильтра');
    return;
  }

  const activeLayer = layers.find(layer => layer.id === activeLayerId);
  if (!activeLayer || !activeLayer.imageData) {
    onError('Активный слой не содержит данных изображения');
    return;
  }

  try {
    let filteredImageData: ImageData;

    if (shouldUseWorker(activeLayer.imageData)) {
      try {
        const workerPool = getGlobalWorkerPool();
        const message: FilterWorkerMessage = {
          type: 'APPLY_LAPLACIAN_FILTER',
          imageData: activeLayer.imageData,
          params: {}
        };
        
        filteredImageData = await workerPool.applyFilter(message);
      } catch (workerError) {
        console.warn('Ошибка Web Worker, используем основной поток:', workerError);
        filteredImageData = applyLaplacianFilter(activeLayer.imageData);
      }
    } else {
      filteredImageData = applyLaplacianFilter(activeLayer.imageData);
    }

    updateLayer(activeLayerId, { imageData: filteredImageData });
  } catch (error) {
    onError(error instanceof Error ? error.message : 'Ошибка применения фильтра Лапласа');
  }
}