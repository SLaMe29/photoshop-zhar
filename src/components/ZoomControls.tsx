import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

// Predefined zoom levels
export const ZOOM_LEVELS = [12, 25, 50, 75, 100, 125, 150, 200, 300];

interface ZoomControlsProps {
  zoomLevel: number;
  onZoomChange: (newZoom: number) => void;
}

export function ZoomControls({ zoomLevel, onZoomChange }: ZoomControlsProps) {
  return (
    <div className="flex items-center gap-2 sm:gap-4">
      <span className="whitespace-nowrap">Масштаб:</span>
      
      <div className="w-24 sm:w-32 flex-shrink-0">
        <Select
          value={zoomLevel.toString()}
          onValueChange={(value) => onZoomChange(parseInt(value, 10))}
        >
          <SelectTrigger className="text-xs sm:text-sm">
            <SelectValue placeholder="Масштаб" />
          </SelectTrigger>
          <SelectContent>
            {ZOOM_LEVELS.map((level) => (
              <SelectItem key={level} value={level.toString()}>
                {level}%
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="w-24 sm:w-40 flex-shrink-0">
        <Slider
          min={12}
          max={300}
          step={1}
          value={[zoomLevel]}
          onValueChange={(values) => onZoomChange(values[0])}
        />
      </div>
    </div>
  );
}