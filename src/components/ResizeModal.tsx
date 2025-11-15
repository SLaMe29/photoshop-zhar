import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { interpolationInfo } from '@/lib/interpolation';

interface ResizeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResize: (width: number, height: number, method: 'nearest' | 'bilinear') => void;
  originalWidth: number;
  originalHeight: number;
}

export function ResizeModal({ 
  open, 
  onOpenChange, 
  onResize, 
  originalWidth, 
  originalHeight 
}: ResizeModalProps) {
  const [width, setWidth] = useState<number>(originalWidth);
  const [height, setHeight] = useState<number>(originalHeight);
  const [unit, setUnit] = useState<'pixels' | 'percent'>('pixels');
  const [maintainAspectRatio, setMaintainAspectRatio] = useState<boolean>(true);
  const [interpolationMethod, setInterpolationMethod] = useState<'nearest' | 'bilinear'>('bilinear');
  const [errors, setErrors] = useState<{width?: string; height?: string}>({});

  // Calculate original megapixels
  const originalMegapixels = (originalWidth * originalHeight / 1000000).toFixed(2);
  
  // Calculate new megapixels
  const newMegapixels = (width * height / 1000000).toFixed(2);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setWidth(originalWidth);
      setHeight(originalHeight);
      setUnit('pixels');
      setMaintainAspectRatio(true);
      setInterpolationMethod('bilinear');
      setErrors({});
    }
  }, [open, originalWidth, originalHeight]);

  // Handle width change
  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = parseInt(e.target.value, 10);
    
    if (isNaN(newWidth)) {
      setWidth(0);
      setErrors({...errors, width: 'Ширина должна быть числом'});
      return;
    }
    
    if (newWidth <= 0) {
      setWidth(newWidth);
      setErrors({...errors, width: 'Ширина должна быть больше 0'});
      return;
    }
    
    if (unit === 'percent' && newWidth > 1000) {
      setWidth(newWidth);
      setErrors({...errors, width: 'Максимальный процент - 1000%'});
      return;
    }
    
    if (unit === 'pixels' && newWidth > 10000) {
      setWidth(newWidth);
      setErrors({...errors, width: 'Максимальная ширина - 10000px'});
      return;
    }
    
    setWidth(newWidth);
    setErrors({...errors, width: undefined});
    
    if (maintainAspectRatio) {
      const aspectRatio = originalWidth / originalHeight;
      let newHeight;
      
      if (unit === 'percent') {
        // For percentages, keep the same percentage for width and height
        newHeight = newWidth;
      } else {
        // For pixels, calculate based on aspect ratio
        newHeight = Math.round(newWidth / aspectRatio);
      }
      
      setHeight(newHeight);
      
      // Validate height
      if (unit === 'percent' && newHeight > 1000) {
        setErrors({...errors, width: undefined, height: 'Максимальный процент - 1000%'});
      } else if (unit === 'pixels' && newHeight > 10000) {
        setErrors({...errors, width: undefined, height: 'Максимальная высота - 10000px'});
      } else {
        setErrors({...errors, width: undefined, height: undefined});
      }
    }
  };

  // Handle height change
  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeight = parseInt(e.target.value, 10);
    
    if (isNaN(newHeight)) {
      setHeight(0);
      setErrors({...errors, height: 'Высота должна быть числом'});
      return;
    }
    
    if (newHeight <= 0) {
      setHeight(newHeight);
      setErrors({...errors, height: 'Высота должна быть больше 0'});
      return;
    }
    
    if (unit === 'percent' && newHeight > 1000) {
      setHeight(newHeight);
      setErrors({...errors, height: 'Максимальный процент - 1000%'});
      return;
    }
    
    if (unit === 'pixels' && newHeight > 10000) {
      setHeight(newHeight);
      setErrors({...errors, height: 'Максимальная высота - 10000px'});
      return;
    }
    
    setHeight(newHeight);
    setErrors({...errors, height: undefined});
    
    if (maintainAspectRatio) {
      const aspectRatio = originalWidth / originalHeight;
      let newWidth;
      
      if (unit === 'percent') {
        // For percentages, keep the same percentage for width and height
        newWidth = newHeight;
      } else {
        // For pixels, calculate based on aspect ratio
        newWidth = Math.round(newHeight * aspectRatio);
      }
      
      setWidth(newWidth);
      
      // Validate width
      if (unit === 'percent' && newWidth > 1000) {
        setErrors({...errors, height: undefined, width: 'Максимальный процент - 1000%'});
      } else if (unit === 'pixels' && newWidth > 10000) {
        setErrors({...errors, height: undefined, width: 'Максимальная ширина - 10000px'});
      } else {
        setErrors({...errors, height: undefined, width: undefined});
      }
    }
  };

  // Handle unit change
  const handleUnitChange = (value: 'pixels' | 'percent') => {
    if (value === unit) return;
    
    let newWidth, newHeight;
    
    if (value === 'percent') {
      // Convert pixels to percent
      newWidth = Math.round((width / originalWidth) * 100);
      newHeight = Math.round((height / originalHeight) * 100);
    } else {
      // Convert percent to pixels
      newWidth = Math.round((width / 100) * originalWidth);
      newHeight = Math.round((height / 100) * originalHeight);
    }
    
    // Update the unit first
    setUnit(value);
    
    // Then update the dimensions
    setTimeout(() => {
      setWidth(newWidth);
      setHeight(newHeight);
      setErrors({});
    }, 0);
  };

  // Handle resize
  const handleResize = () => {
    if (errors.width || errors.height) return;
    
    let finalWidth, finalHeight;
    
    if (unit === 'percent') {
      // Convert percentage values to pixels for the actual resize operation
      finalWidth = Math.round((width / 100) * originalWidth);
      finalHeight = Math.round((height / 100) * originalHeight);
    } else {
      // Use pixel values directly
      finalWidth = width;
      finalHeight = height;
    }
    
    // Double-check that the aspect ratio is maintained if needed
    if (maintainAspectRatio) {
      const aspectRatio = originalWidth / originalHeight;
      
      if (unit === 'percent') {
        // For percentages, both width and height should be the same percentage
        // No need to adjust as we've already set them to be the same in the UI
      } else {
        // For pixels, we adjust the height based on the width to maintain aspect ratio
        finalHeight = Math.round(finalWidth / aspectRatio);
      }
    }
    
    // Ensure we're passing pixel values to the resize function
    onResize(finalWidth, finalHeight, interpolationMethod);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Изменить размер</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="flex justify-between text-sm gap-4">
            <span className="whitespace-nowrap">Исходный размер: {originalMegapixels} МП ({originalWidth} × {originalHeight})</span>
            <span className="whitespace-nowrap">Новый размер: {newMegapixels} МП ({width} × {height})</span>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Единицы</Label>
            <div className="col-span-3">
              <Select
                value={unit}
                onValueChange={(value) => handleUnitChange(value as 'pixels' | 'percent')}
              >
              <SelectTrigger>
                <SelectValue placeholder="Выберите единицы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pixels">Пиксели</SelectItem>
                <SelectItem value="percent">Проценты</SelectItem>
              </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="width" className="text-right">Ширина</Label>
            <div className="col-span-3 space-y-1">
              <Input
                id="width"
                type="number"
                value={width}
                onChange={handleWidthChange}
                min={1}
                max={unit === 'percent' ? 1000 : 10000}
              />
              {errors.width && <p className="text-destructive text-xs">{errors.width}</p>}
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="height" className="text-right">Высота</Label>
            <div className="col-span-3 space-y-1">
              <Input
                id="height"
                type="number"
                value={height}
                onChange={handleHeightChange}
                min={1}
                max={unit === 'percent' ? 1000 : 10000}
              />
              {errors.height && <p className="text-destructive text-xs">{errors.height}</p>}
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <div></div>
            <div className="col-span-3 flex items-center space-x-2">
              <Checkbox
                id="maintain-aspect-ratio"
                checked={maintainAspectRatio}
                onCheckedChange={(checked) => setMaintainAspectRatio(checked as boolean)}
              />
              <Label htmlFor="maintain-aspect-ratio">Сохранять пропорции</Label>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Интерполяция</Label>
            <div className="col-span-3">
              <Select
                value={interpolationMethod}
                onValueChange={(value) => setInterpolationMethod(value as 'nearest' | 'bilinear')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите метод" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nearest">{interpolationInfo.nearest.name}</SelectItem>
                  <SelectItem value="bilinear">{interpolationInfo.bilinear.name}</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Показать информацию об интерполяции при наведении */}
              <div className="mt-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center text-sm text-primary cursor-help hover:underline">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="M12 16v-4"></path>
                          <path d="M12 8h.01"></path>
                        </svg>
                        <span>Что такое {interpolationMethod === 'nearest' ? interpolationInfo.nearest.name : interpolationInfo.bilinear.name}?</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="start" className="max-w-[300px] p-4 text-sm">
                      <p>{interpolationMethod === 'nearest' ? interpolationInfo.nearest.description : interpolationInfo.bilinear.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button
            onClick={handleResize}
            disabled={!!errors.width || !!errors.height || width <= 0 || height <= 0}
          >
            Изменить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}