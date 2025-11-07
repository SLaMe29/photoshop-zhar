import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  calculateHistogram, 
  generateHistogramPath, 
  createLookupTable, 
  applyLookupTable,
  type CurvePoint,
  type HistogramData 
} from '@/lib/histogram';

interface CurvesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (imageData: ImageData) => void;
  imageData: ImageData | null;
  isAlphaChannel?: boolean;
}

export function CurvesModal({ 
  open, 
  onOpenChange, 
  onApply, 
  imageData,
  isAlphaChannel = false
}: CurvesModalProps) {
  // Curve points state
  const [point1, setPoint1] = useState<CurvePoint>({ input: 0, output: 0 });
  const [point2, setPoint2] = useState<CurvePoint>({ input: 255, output: 255 });
  
  // Preview state
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [, setPreviewImageData] = useState<ImageData | null>(null);
  
  // Input validation errors
  const [errors, setErrors] = useState<{
    point1Input?: string;
    point1Output?: string;
    point2Input?: string;
    point2Output?: string;
  }>({});

  // Calculate histogram data
  const histogramData: HistogramData | null = useMemo(() => {
    if (!imageData) return null;
    return calculateHistogram(imageData, isAlphaChannel);
  }, [imageData, isAlphaChannel]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setPoint1({ input: 0, output: 0 });
      setPoint2({ input: 255, output: 255 });
      setPreviewEnabled(false);
      setPreviewImageData(null);
      setErrors({});
    }
  }, [open]);

  // Update preview when points change and preview is enabled
  useEffect(() => {
    if (previewEnabled && imageData && !Object.values(errors).some(error => !!error)) {
      updatePreview();
    } else {
      setPreviewImageData(null);
    }
  }, [point1, point2, previewEnabled, imageData, errors]);

  const updatePreview = () => {
    if (!imageData) return;

    try {
      const lut = createLookupTable(point1, point2);
      
      let correctedImageData: ImageData;
      if (isAlphaChannel) {
        // For alpha channel, apply LUT only to alpha values
        correctedImageData = applyLookupTable(imageData, 
          new Uint8Array(256).map((_, i) => i), // Red unchanged
          new Uint8Array(256).map((_, i) => i), // Green unchanged  
          new Uint8Array(256).map((_, i) => i), // Blue unchanged
          lut // Alpha corrected
        );
      } else {
        // For RGB, apply LUT to all color channels
        correctedImageData = applyLookupTable(imageData, lut, lut, lut);
      }
      
      setPreviewImageData(correctedImageData);
    } catch (error) {
      console.error('Error updating preview:', error);
      setPreviewImageData(null);
    }
  };

  const validateInput = (value: number): string | undefined => {
    if (isNaN(value) || value < 0 || value > 255) {
      return 'Значение должно быть от 0 до 255';
    }
    return undefined;
  };

  const handlePoint1InputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    const error = validateInput(value);
    
    setErrors(prev => ({ ...prev, point1Input: error }));
    if (!error) {
      setPoint1(prev => ({ ...prev, input: value }));
    }
  };

  const handlePoint1OutputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    const error = validateInput(value);
    
    setErrors(prev => ({ ...prev, point1Output: error }));
    if (!error) {
      setPoint1(prev => ({ ...prev, output: value }));
    }
  };

  const handlePoint2InputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    const error = validateInput(value);
    
    setErrors(prev => ({ ...prev, point2Input: error }));
    if (!error) {
      setPoint2(prev => ({ ...prev, input: value }));
    }
  };

  const handlePoint2OutputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    const error = validateInput(value);
    
    setErrors(prev => ({ ...prev, point2Output: error }));
    if (!error) {
      setPoint2(prev => ({ ...prev, output: value }));
    }
  };

  const handleReset = () => {
    setPoint1({ input: 0, output: 0 });
    setPoint2({ input: 255, output: 255 });
    setErrors({});
  };

  const handleApply = () => {
    if (!imageData || Object.values(errors).some(error => !!error)) return;

    try {
      const lut = createLookupTable(point1, point2);
      
      let correctedImageData: ImageData;
      if (isAlphaChannel) {
        correctedImageData = applyLookupTable(imageData, 
          new Uint8Array(256).map((_, i) => i),
          new Uint8Array(256).map((_, i) => i),
          new Uint8Array(256).map((_, i) => i),
          lut
        );
      } else {
        correctedImageData = applyLookupTable(imageData, lut, lut, lut);
      }
      
      onApply(correctedImageData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error applying curves:', error);
    }
  };

  const graphSize = 256;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Кривые - {isAlphaChannel ? 'Альфа-канал' : 'RGB'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* Histogram and Curve Graph */}
          <div className="flex justify-center">
            <div className="relative">
              <svg 
                width={graphSize} 
                height={graphSize} 
                className="border border-gray-300 bg-white"
                viewBox={`0 0 ${graphSize} ${graphSize}`}
              >
                {/* Grid lines */}
                <defs>
                  <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                    <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#e5e5e5" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                
                {/* Histograms */}
                {histogramData && (
                  <>
                    {!isAlphaChannel && (
                      <>
                        {/* Red histogram */}
                        <path
                          d={generateHistogramPath(histogramData.red, graphSize, graphSize)}
                          fill="rgba(255, 0, 0, 0.3)"
                          stroke="rgba(255, 0, 0, 0.6)"
                          strokeWidth="1"
                        />
                        {/* Green histogram */}
                        <path
                          d={generateHistogramPath(histogramData.green, graphSize, graphSize)}
                          fill="rgba(0, 255, 0, 0.3)"
                          stroke="rgba(0, 255, 0, 0.6)"
                          strokeWidth="1"
                        />
                        {/* Blue histogram */}
                        <path
                          d={generateHistogramPath(histogramData.blue, graphSize, graphSize)}
                          fill="rgba(0, 0, 255, 0.3)"
                          stroke="rgba(0, 0, 255, 0.6)"
                          strokeWidth="1"
                        />
                      </>
                    )}
                    {isAlphaChannel && histogramData.alpha && (
                      <path
                        d={generateHistogramPath(histogramData.alpha, graphSize, graphSize)}
                        fill="rgba(0, 0, 0, 0.3)"
                        stroke="rgba(0, 0, 0, 0.6)"
                        strokeWidth="1"
                      />
                    )}
                  </>
                )}
                
                {/* Curve line */}
                <line
                  x1={point1.input}
                  y1={graphSize - point1.output}
                  x2={point2.input}
                  y2={graphSize - point2.output}
                  stroke="black"
                  strokeWidth="2"
                />
                
                {/* Horizontal extensions */}
                <line
                  x1="0"
                  y1={graphSize - point1.output}
                  x2={point1.input}
                  y2={graphSize - point1.output}
                  stroke="black"
                  strokeWidth="2"
                />
                <line
                  x1={point2.input}
                  y1={graphSize - point2.output}
                  x2={graphSize}
                  y2={graphSize - point2.output}
                  stroke="black"
                  strokeWidth="2"
                />
                
                {/* Control points */}
                <circle
                  cx={point1.input}
                  cy={graphSize - point1.output}
                  r="4"
                  fill="white"
                  stroke="black"
                  strokeWidth="2"
                />
                <circle
                  cx={point2.input}
                  cy={graphSize - point2.output}
                  r="4"
                  fill="white"
                  stroke="black"
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>

          {/* Input/Output Controls */}
          <div className="grid grid-cols-2 gap-6">
            {/* Point 1 */}
            <div className="space-y-4">
              <h4 className="font-medium">Точка 1</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="point1-input">Вход</Label>
                  <Input
                    id="point1-input"
                    type="number"
                    min="0"
                    max="255"
                    value={point1.input}
                    onChange={handlePoint1InputChange}
                  />
                  {errors.point1Input && (
                    <p className="text-destructive text-xs mt-1">{errors.point1Input}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="point1-output">Выход</Label>
                  <Input
                    id="point1-output"
                    type="number"
                    min="0"
                    max="255"
                    value={point1.output}
                    onChange={handlePoint1OutputChange}
                  />
                  {errors.point1Output && (
                    <p className="text-destructive text-xs mt-1">{errors.point1Output}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Point 2 */}
            <div className="space-y-4">
              <h4 className="font-medium">Точка 2</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="point2-input">Вход</Label>
                  <Input
                    id="point2-input"
                    type="number"
                    min="0"
                    max="255"
                    value={point2.input}
                    onChange={handlePoint2InputChange}
                  />
                  {errors.point2Input && (
                    <p className="text-destructive text-xs mt-1">{errors.point2Input}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="point2-output">Выход</Label>
                  <Input
                    id="point2-output"
                    type="number"
                    min="0"
                    max="255"
                    value={point2.output}
                    onChange={handlePoint2OutputChange}
                  />
                  {errors.point2Output && (
                    <p className="text-destructive text-xs mt-1">{errors.point2Output}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Preview checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="preview"
              checked={previewEnabled}
              onCheckedChange={(checked) => setPreviewEnabled(checked as boolean)}
            />
            <Label htmlFor="preview">Предпросмотр</Label>
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleReset}>
            Сброс
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleApply}
            disabled={Object.values(errors).some(error => !!error) || !imageData}
          >
            Применить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}