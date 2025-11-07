import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useEditor } from '@/context/EditorContext';
import { 
  applyGaussianBlurToLayer, 
  applyMedianFilterToLayer, 
  applyLaplacianFilterToLayer 
} from '@/components/FilterHandler';

interface FiltersMenuProps {
  onError: (error: string) => void;
}

export function FiltersMenu({ onError }: FiltersMenuProps) {
  const { layers, activeLayerId, updateLayer } = useEditor();
  const [gaussianOpen, setGaussianOpen] = useState(false);
  const [medianOpen, setMedianOpen] = useState(false);
  const [sigma, setSigma] = useState([1.0]);
  const [kernelSize, setKernelSize] = useState([3]);

  const handleGaussianBlur = async () => {
    await applyGaussianBlurToLayer(layers, activeLayerId, updateLayer, onError, sigma[0]);
    setGaussianOpen(false);
  };

  const handleMedianFilter = async () => {
    await applyMedianFilterToLayer(layers, activeLayerId, updateLayer, onError, kernelSize[0]);
    setMedianOpen(false);
  };

  const handleLaplacianFilter = async () => {
    await applyLaplacianFilterToLayer(layers, activeLayerId, updateLayer, onError);
  };

  const isDisabled = layers.length === 0 || !activeLayerId;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Быстрые фильтры</h3>
      
      {/* Размытие по Гауссу */}
      <Dialog open={gaussianOpen} onOpenChange={setGaussianOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={isDisabled} className="w-full justify-start">
            Размытие по Гауссу
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Размытие по Гауссу</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Сила размытия: {sigma[0].toFixed(1)}</Label>
              <Slider
                value={sigma}
                onValueChange={setSigma}
                min={0.5}
                max={5.0}
                step={0.1}
                className="w-full"
              />
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setGaussianOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleGaussianBlur}>
                Применить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Медианная фильтрация */}
      <Dialog open={medianOpen} onOpenChange={setMedianOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={isDisabled} className="w-full justify-start">
            Медианная фильтрация
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Медианная фильтрация</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Размер ядра: {kernelSize[0]}×{kernelSize[0]}</Label>
              <Slider
                value={kernelSize}
                onValueChange={setKernelSize}
                min={3}
                max={9}
                step={2}
                className="w-full"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Медианная фильтрация эффективно удаляет шум, сохраняя края изображения.
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setMedianOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleMedianFilter}>
                Применить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Фильтр Лапласа */}
      <Button 
        variant="outline" 
        size="sm" 
        disabled={isDisabled} 
        className="w-full justify-start"
        onClick={handleLaplacianFilter}
      >
        Фильтр Лапласа
      </Button>

      {isDisabled && (
        <p className="text-xs text-muted-foreground">
          Выберите активный слой для применения фильтров
        </p>
      )}
    </div>
  );
}