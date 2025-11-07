import React from 'react';
import { useEditor } from '@/context/EditorContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { colorSpaceInfo } from '@/lib/colorSpaces';

export function ColorPicker() {
  const { activeTool, primaryColor, secondaryColor, getColorContrast } = useEditor();
  
  // Если инструмент не пипетка, не показываем панель
  if (activeTool !== 'eyedropper') {
    return null;
  }
  
  const contrast = getColorContrast();
  
  return (
    <div className="fixed bottom-0 right-0 p-4 bg-background border rounded-tl-lg shadow-lg w-80">
      <h3 className="text-lg font-semibold mb-4">Информация о цвете</h3>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Первый цвет */}
        <div>
          <h4 className="text-sm font-medium mb-2">Основной цвет</h4>
          {primaryColor ? (
            <ColorInfo color={primaryColor} />
          ) : (
            <div className="text-sm text-muted-foreground">
              Кликните на изображение для выбора цвета
            </div>
          )}
        </div>
        
        {/* Второй цвет */}
        <div>
          <h4 className="text-sm font-medium mb-2">Дополнительный цвет</h4>
          {secondaryColor ? (
            <ColorInfo color={secondaryColor} />
          ) : (
            <div className="text-sm text-muted-foreground">
              Кликните с Alt/Shift/Ctrl для выбора цвета
            </div>
          )}
        </div>
      </div>
      
      {/* Контраст между цветами */}
      <div className="mt-4 pt-4 border-t">
        <h4 className="text-sm font-medium mb-2">Контраст (WCAG 2.0)</h4>
        {contrast ? (
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{contrast.value.toFixed(2)}:1</span>
            <span className={contrast.isSufficient ? "text-green-500" : "text-red-500"}>
              {contrast.isSufficient ? "Достаточный" : "Недостаточный"}
            </span>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Выберите два цвета для расчета контраста
          </div>
        )}
      </div>
    </div>
  );
}

// Компонент для отображения информации о цвете
function ColorInfo({ color }: { color: ReturnType<typeof useEditor>['primaryColor'] }) {
  if (!color) return null;
  
  const { rgb, coordinates, hex, allSpaces } = color;
  
  return (
    <div className="space-y-2">
      {/* Образец цвета */}
      <div 
        className="w-full h-10 rounded border"
        style={{ backgroundColor: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` }}
      />
      
      {/* Координаты */}
      <div className="text-xs">
        <div>X: {coordinates.x}, Y: {coordinates.y}</div>
        <div>HEX: {hex}</div>
      </div>
      
      {/* Цветовые пространства */}
      <TooltipProvider>
        <div className="space-y-1">
          <ColorSpaceValue 
            name="RGB" 
            value={`(${rgb.r}, ${rgb.g}, ${rgb.b})`} 
            info={colorSpaceInfo.RGB}
          />
          
          <ColorSpaceValue 
            name="XYZ" 
            value={`(${allSpaces.xyz.x.toFixed(2)}, ${allSpaces.xyz.y.toFixed(2)}, ${allSpaces.xyz.z.toFixed(2)})`} 
            info={colorSpaceInfo.XYZ}
          />
          
          <ColorSpaceValue 
            name="Lab" 
            value={`(${allSpaces.lab.l.toFixed(2)}, ${allSpaces.lab.a.toFixed(2)}, ${allSpaces.lab.b.toFixed(2)})`} 
            info={colorSpaceInfo.Lab}
          />
          
          <ColorSpaceValue 
            name="LCH" 
            value={`(${allSpaces.lch.l.toFixed(2)}, ${allSpaces.lch.c.toFixed(2)}, ${allSpaces.lch.h.toFixed(2)}°)`} 
            info={colorSpaceInfo.LCH}
          />
          
          <ColorSpaceValue 
            name="OKLch" 
            value={`(${allSpaces.oklch.l.toFixed(3)}, ${allSpaces.oklch.c.toFixed(3)}, ${allSpaces.oklch.h.toFixed(1)}°)`} 
            info={colorSpaceInfo.OKLch}
          />
        </div>
      </TooltipProvider>
    </div>
  );
}

// Компонент для отображения значения в цветовом пространстве с тултипом
function ColorSpaceValue({ 
  name, 
  value, 
  info 
}: { 
  name: string; 
  value: string; 
  info: typeof colorSpaceInfo[keyof typeof colorSpaceInfo];
}) {
  return (
    <div className="flex justify-between text-xs">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="font-medium cursor-help">{name}:</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-80 p-4">
          <div className="space-y-2">
            <p>{info.description}</p>
            <div className="space-y-1">
              <p className="font-semibold">Оси:</p>
              <ul className="list-disc pl-5 space-y-1">
                {info.axes.map((axis) => (
                  <li key={axis.name}>
                    <span className="font-medium">{axis.name}</span>: {axis.description} ({axis.range})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
      <span>{value}</span>
    </div>
  );
}