import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FILTER_PRESETS, type Kernel } from '@/lib/filters';

interface FilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (kernel: Kernel) => void;
  onError: (error: string) => void;
}

export function FilterModal({ open, onOpenChange, onApply, onError }: FilterModalProps) {
  // Состояние для 3x3 матрицы ядра
  const [kernelMatrix, setKernelMatrix] = useState<number[][]>([
    [0, 0, 0],
    [0, 1, 0],
    [0, 0, 0]
  ]);
  
  const [divisor, setDivisor] = useState<number>(1);
  const [offset, setOffset] = useState<number>(0);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [previewEnabled, setPreviewEnabled] = useState<boolean>(false);

  // Сброс к начальным значениям
  const resetToDefault = () => {
    setKernelMatrix([
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 0]
    ]);
    setDivisor(1);
    setOffset(0);
    setSelectedPreset('');
  };

  // Применение предустановленного фильтра
  const applyPreset = (presetName: string) => {
    const preset = FILTER_PRESETS.find(p => p.name === presetName);
    if (preset) {
      setKernelMatrix(preset.kernel.matrix);
      setDivisor(preset.kernel.divisor || 1);
      setOffset(preset.kernel.offset || 0);
      setSelectedPreset(presetName);
    }
  };

  // Обновление значения в матрице
  const updateMatrixValue = (row: number, col: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newMatrix = kernelMatrix.map((r, i) =>
      r.map((c, j) => (i === row && j === col) ? numValue : c)
    );
    setKernelMatrix(newMatrix);
    setSelectedPreset(''); // Сбрасываем выбранный пресет при ручном изменении
  };

  // Применение фильтра
  const handleApply = () => {
    try {
      const kernel: Kernel = {
        matrix: kernelMatrix,
        divisor: divisor || 1,
        offset: offset || 0
      };
      
      onApply(kernel);
      onOpenChange(false);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Ошибка применения фильтра');
    }
  };

  // Предпросмотр (пока заглушка)
  useEffect(() => {
    if (previewEnabled && open) {
      // Здесь будет логика предпросмотра
      console.log('Preview enabled with kernel:', kernelMatrix);
    }
  }, [previewEnabled, kernelMatrix, divisor, offset, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Фильтрация с ядром</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Выбор предустановленного фильтра */}
          <div className="space-y-2">
            <Label>Предустановленные фильтры</Label>
            <Select value={selectedPreset} onValueChange={applyPreset}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите фильтр..." />
              </SelectTrigger>
              <SelectContent>
                {FILTER_PRESETS.map((preset) => (
                  <SelectItem key={preset.name} value={preset.name}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Матрица ядра 3x3 */}
          <div className="space-y-2">
            <Label>Ядро фильтра (3×3)</Label>
            <div className="grid grid-cols-3 gap-1 w-fit mx-auto">
              {kernelMatrix.map((row, i) =>
                row.map((value, j) => (
                  <Input
                    key={`${i}-${j}`}
                    type="number"
                    step="0.1"
                    value={value}
                    onChange={(e) => updateMatrixValue(i, j, e.target.value)}
                    className="w-16 h-12 text-center text-sm"
                  />
                ))
              )}
            </div>
          </div>

          {/* Делитель и смещение */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="divisor">Делитель</Label>
              <Input
                id="divisor"
                type="number"
                step="0.1"
                value={divisor}
                onChange={(e) => setDivisor(parseFloat(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offset">Смещение</Label>
              <Input
                id="offset"
                type="number"
                step="1"
                value={offset}
                onChange={(e) => setOffset(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Предпросмотр */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="preview"
              checked={previewEnabled}
              onCheckedChange={(checked) => setPreviewEnabled(checked as boolean)}
            />
            <Label htmlFor="preview">Предпросмотр</Label>
          </div>

          {/* Кнопки управления */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Закрыть
            </Button>
            
            <div className="space-x-2">
              <Button variant="outline" onClick={resetToDefault}>
                Сбросить
              </Button>
              <Button onClick={handleApply}>
                Применить
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}