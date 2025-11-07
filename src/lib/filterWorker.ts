// Web Worker для обработки фильтров в отдельном потоке
// Это позволяет избежать блокировки UI при обработке больших изображений

export interface FilterWorkerMessage {
  type: 'APPLY_KERNEL_FILTER' | 'APPLY_MEDIAN_FILTER' | 'APPLY_GAUSSIAN_BLUR' | 'APPLY_LAPLACIAN_FILTER';
  imageData: ImageData;
  params?: {
    kernel?: {
      matrix: number[][];
      divisor?: number;
      offset?: number;
    };
    kernelSize?: number;
    sigma?: number;
  };
}

export interface FilterWorkerResponse {
  type: 'SUCCESS' | 'ERROR';
  imageData?: ImageData;
  error?: string;
}

// Создание Web Worker с динамическим импортом
export async function createFilterWorker(): Promise<Worker | null> {
  if (typeof Worker === 'undefined') {
    console.warn('Web Workers не поддерживаются в этом браузере');
    return null;
  }

  try {
    // Динамический импорт функций фильтрации
    const { applyKernelFilter, applyMedianFilter, applyGaussianBlur, applyLaplacianFilter } = await import('./filters');

    const workerCode = `
      // Функции фильтрации (копируем в worker)
      ${applyKernelFilter.toString()}
      ${applyMedianFilter.toString()}
      ${applyGaussianBlur.toString()}
      ${applyLaplacianFilter.toString()}

      // Вспомогательные функции для worker
      function padImageData(imageData, padSize = 1) {
        const { width, height, data } = imageData;
        const paddedWidth = width + 2 * padSize;
        const paddedHeight = height + 2 * padSize;
        const paddedData = new Uint8ClampedArray(paddedWidth * paddedHeight * 4);

        // Копируем исходные данные в центр расширенного изображения
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const srcIndex = (y * width + x) * 4;
            const dstIndex = ((y + padSize) * paddedWidth + (x + padSize)) * 4;
            
            paddedData[dstIndex] = data[srcIndex];
            paddedData[dstIndex + 1] = data[srcIndex + 1];
            paddedData[dstIndex + 2] = data[srcIndex + 2];
            paddedData[dstIndex + 3] = data[srcIndex + 3];
          }
        }

        // Расширяем края
        for (let y = 0; y < padSize; y++) {
          for (let x = padSize; x < paddedWidth - padSize; x++) {
            const topSrcIndex = (padSize * paddedWidth + x) * 4;
            const topDstIndex = (y * paddedWidth + x) * 4;
            
            const bottomSrcIndex = ((paddedHeight - padSize - 1) * paddedWidth + x) * 4;
            const bottomDstIndex = ((paddedHeight - 1 - y) * paddedWidth + x) * 4;
            
            for (let c = 0; c < 4; c++) {
              paddedData[topDstIndex + c] = paddedData[topSrcIndex + c];
              paddedData[bottomDstIndex + c] = paddedData[bottomSrcIndex + c];
            }
          }
        }

        for (let y = 0; y < paddedHeight; y++) {
          for (let x = 0; x < padSize; x++) {
            const leftSrcIndex = (y * paddedWidth + padSize) * 4;
            const leftDstIndex = (y * paddedWidth + x) * 4;
            
            const rightSrcIndex = (y * paddedWidth + (paddedWidth - padSize - 1)) * 4;
            const rightDstIndex = (y * paddedWidth + (paddedWidth - 1 - x)) * 4;
            
            for (let c = 0; c < 4; c++) {
              paddedData[leftDstIndex + c] = paddedData[leftSrcIndex + c];
              paddedData[rightDstIndex + c] = paddedData[rightSrcIndex + c];
            }
          }
        }

        return new ImageData(paddedData, paddedWidth, paddedHeight);
      }

      // Обработчик сообщений
      self.onmessage = function(e) {
        const { type, imageData, params = {} } = e.data;
        
        try {
          let result;
          
          switch (type) {
            case 'APPLY_KERNEL_FILTER':
              if (!params.kernel) {
                throw new Error('Не указано ядро фильтра');
              }
              result = applyKernelFilter(imageData, params.kernel);
              break;
              
            case 'APPLY_MEDIAN_FILTER':
              result = applyMedianFilter(imageData, params.kernelSize || 3);
              break;
              
            case 'APPLY_GAUSSIAN_BLUR':
              result = applyGaussianBlur(imageData, params.sigma || 1.0);
              break;
              
            case 'APPLY_LAPLACIAN_FILTER':
              result = applyLaplacianFilter(imageData);
              break;
              
            default:
              throw new Error('Неизвестный тип фильтра: ' + type);
          }
          
          self.postMessage({
            type: 'SUCCESS',
            imageData: result
          });
          
        } catch (error) {
          self.postMessage({
            type: 'ERROR',
            error: error.message || 'Ошибка обработки фильтра'
          });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    
    return worker;
  } catch (error) {
    console.error('Ошибка создания Web Worker:', error);
    return null;
  }
}

// Функция для применения фильтра через Web Worker
export function applyFilterWithWorker(
  worker: Worker,
  message: FilterWorkerMessage
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Таймаут обработки фильтра'));
    }, 30000); // 30 секунд таймаут

    const handleMessage = (e: MessageEvent<FilterWorkerResponse>) => {
      clearTimeout(timeout);
      worker.removeEventListener('message', handleMessage);
      
      if (e.data.type === 'SUCCESS' && e.data.imageData) {
        resolve(e.data.imageData);
      } else {
        reject(new Error(e.data.error || 'Неизвестная ошибка'));
      }
    };

    worker.addEventListener('message', handleMessage);
    worker.postMessage(message);
  });
}

// Утилита для определения, нужно ли использовать Web Worker
export function shouldUseWorker(imageData: ImageData): boolean {
  // Используем Web Worker для изображений больше 500x500 пикселей
  const pixelCount = imageData.width * imageData.height;
  return pixelCount > 250000; // 500 * 500
}

// Класс для управления пулом Web Workers
export class FilterWorkerPool {
  private workers: Worker[] = [];
  private busyWorkers = new Set<Worker>();
  private maxWorkers: number;

  constructor(maxWorkers: number = navigator.hardwareConcurrency || 4) {
    this.maxWorkers = Math.min(maxWorkers, 8); // Максимум 8 воркеров
  }

  async getWorker(): Promise<Worker | null> {
    // Ищем свободного воркера
    const freeWorker = this.workers.find(w => !this.busyWorkers.has(w));
    if (freeWorker) {
      this.busyWorkers.add(freeWorker);
      return freeWorker;
    }

    // Создаем нового воркера, если не достигли лимита
    if (this.workers.length < this.maxWorkers) {
      const worker = await createFilterWorker();
      if (worker) {
        this.workers.push(worker);
        this.busyWorkers.add(worker);
        return worker;
      }
    }

    return null;
  }

  releaseWorker(worker: Worker): void {
    this.busyWorkers.delete(worker);
  }

  async applyFilter(message: FilterWorkerMessage): Promise<ImageData> {
    const worker = await this.getWorker();
    if (!worker) {
      throw new Error('Не удалось получить Web Worker');
    }

    try {
      const result = await applyFilterWithWorker(worker, message);
      return result;
    } finally {
      this.releaseWorker(worker);
    }
  }

  terminate(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.busyWorkers.clear();
  }
}

// Глобальный экземпляр пула воркеров
let globalWorkerPool: FilterWorkerPool | null = null;

export function getGlobalWorkerPool(): FilterWorkerPool {
  if (!globalWorkerPool) {
    globalWorkerPool = new FilterWorkerPool();
  }
  return globalWorkerPool;
}

export function terminateGlobalWorkerPool(): void {
  if (globalWorkerPool) {
    globalWorkerPool.terminate();
    globalWorkerPool = null;
  }
}