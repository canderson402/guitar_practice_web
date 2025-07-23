import themesData from '../themes.json';

export interface ThemeConfig {
  name: string;
  icon: string;
  background: {
    type: string;
    direction: string;
    colors: string[];
  };
  components: {
    [key: string]: {
      base: string[];
      active: string[];
      border: string;
      textColor?: string;
      innerShadow?: string;
    };
  };
}

export const themes = themesData.themes as Record<string, ThemeConfig>;

export function generateThemeCSS(): string {
  let css = '';
  
  Object.entries(themes).forEach(([themeId, theme]) => {
    // Generate background styles
    const bgColors = theme.background.colors.map((color, index) => {
      const percentage = theme.background.colors.length > 1 
        ? Math.round((index / (theme.background.colors.length - 1)) * 100)
        : 0;
      return `${color} ${percentage}%`;
    }).join(', ');
    
    css += `
/* ===== ${theme.name.toUpperCase()} THEME ===== */
.theme-${themeId} {
  background: linear-gradient(${theme.background.direction}, ${bgColors});
}

.app.theme-${themeId} {
  position: relative;
  background: linear-gradient(${theme.background.direction}, ${bgColors});
}
`;
    
    // Generate component styles
    Object.entries(theme.components).forEach(([componentId, component]) => {
      const textColor = component.textColor || 'white';
      const baseGradient = `linear-gradient(135deg, ${component.base[0]} 0%, ${component.base[1]} 100%)`;
      const activeGradient = `linear-gradient(135deg, ${component.active[0]} 0%, ${component.active[1]} 100%)`;
      const shadowOpacity = themeId === 'metal' ? '0.8' : '0.4';
      
      // Card toggle styles
      css += `
.theme-${themeId} .card-toggle.${componentId} {
  background: ${baseGradient};
  border-color: ${component.border};
  color: ${textColor};${component.innerShadow ? `
  box-shadow: inset 0 1px 0 ${component.innerShadow};` : ''}
}

.theme-${themeId} .card-toggle.${componentId}.active {
  background: ${activeGradient};
  box-shadow: 0 4px 12px rgba(${hexToRgb(component.base[0])}, ${shadowOpacity})${component.innerShadow ? `, inset 0 1px 0 ${component.innerShadow}` : ''};${themeId === 'metal' ? `
  border-color: ${lightenColor(component.border, 20)};` : ''}
}

.theme-${themeId} .card-header.${componentId} {
  background: ${baseGradient};
  border-bottom-color: ${component.active[0]};
  color: ${textColor};${themeId === 'metal' ? `
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);` : ''}
}
`;
    });
  });
  
  return css;
}

function hexToRgb(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `${r}, ${g}, ${b}`;
}

function lightenColor(hex: string, percent: number): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Lighten
  const newR = Math.min(255, Math.round(r + (255 - r) * (percent / 100)));
  const newG = Math.min(255, Math.round(g + (255 - g) * (percent / 100)));
  const newB = Math.min(255, Math.round(b + (255 - b) * (percent / 100)));
  
  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

// Updated with Circle of Fifths colors for all themes
export function injectThemeStyles(): void {
  const styleId = 'dynamic-theme-styles';
  let styleElement = document.getElementById(styleId) as HTMLStyleElement;
  
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = styleId;
    document.head.appendChild(styleElement);
  }
  
  styleElement.textContent = generateThemeCSS();
}