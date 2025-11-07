import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEditor } from '@/context/EditorContext';
import type { Tool } from '@/context/EditorContext';

// Горячие клавиши для инструментов
const TOOL_SHORTCUTS = {
  hand: 'H',
  eyedropper: 'I',
  curves: 'M',
  filter: 'F'
};

// Информация об инструментах
const TOOL_INFO = {
  hand: {
    name: 'Рука',
    description: 'Перемещение изображения (H)',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"></path>
        <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"></path>
        <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"></path>
        <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"></path>
      </svg>
    )
  },
  eyedropper: {
    name: 'Пипетка',
    description: 'Выбор цвета (I)',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m2 22 1-1h3l9-9"></path>
        <path d="M3 21v-3l9-9"></path>
        <path d="m15 6 3.5-3.5a2.12 2.12 0 0 1 3 0 2.12 2.12 0 0 1 0 3L18 9l-3 3-6-6 3-3 3 3Z"></path>
      </svg>
    )
  },
  curves: {
    name: 'Кривые',
    description: 'Градационная коррекция (M)',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12c0-1.2 0-2.4 0-3.6 0-3.2 2.6-5.8 5.8-5.8 1.2 0 2.4 0 3.6 0"></path>
        <path d="M21 12c0 1.2 0 2.4 0 3.6 0 3.2-2.6 5.8-5.8 5.8-1.2 0-2.4 0-3.6 0"></path>
        <circle cx="12" cy="12" r="1"></circle>
        <path d="M12 2v2"></path>
        <path d="M12 20v2"></path>
        <path d="M2 12h2"></path>
        <path d="M20 12h2"></path>
      </svg>
    )
  },
  filter: {
    name: 'Фильтры',
    description: 'Применение фильтров (F)',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46 22,3"></polygon>
      </svg>
    )
  }
};

export function ToolBar() {
  const { activeTool, setActiveTool } = useEditor();

  // Обработчик нажатия клавиш для активации инструментов
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      
      if (key === TOOL_SHORTCUTS.hand) {
        setActiveTool('hand');
      } else if (key === TOOL_SHORTCUTS.eyedropper) {
        setActiveTool('eyedropper');
      } else if (key === TOOL_SHORTCUTS.curves) {
        setActiveTool('curves');
      } else if (key === TOOL_SHORTCUTS.filter) {
        setActiveTool('filter');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTool]);

  return (
    <div className="flex flex-col gap-2 p-2 border-r bg-background">
      <TooltipProvider>
        {(Object.keys(TOOL_INFO) as Tool[]).map((tool) => (
          <Tooltip key={tool}>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === tool ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setActiveTool(tool)}
                className="w-10 h-10"
              >
                {TOOL_INFO[tool].icon}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{TOOL_INFO[tool].description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
}