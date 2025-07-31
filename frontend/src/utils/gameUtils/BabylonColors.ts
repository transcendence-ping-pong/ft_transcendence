export type ThemeColors = {
  body: string;
  accent: string;
  border: string;
  warning: string;
  hover: string;
  shadow: string;
  gameGradientStart: string;
  gameGradientEnd: string;
};

function toCamelCase(str: string): string {
  return str
    .replace(/^--/, '') // Remove leading --
    .replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

/**
 * Reads all CSS variables from the given element (or body by default)
 * and returns an object with variable names (without --) as keys
 * because Babylon doesn't have access to CSS variables directly.
 */
export function getThemeColors(themeName = 'primary') {
  // Compose the class name, e.g., 'theme-primary'
  const themeClass = `.theme-${themeName}`;
  const el = document.querySelector(themeClass) || document.body;
  const styles = getComputedStyle(el);
  const varNames = [
    '--body',
    '--accent',
    '--border',
    '--warning',
    '--hover',
    '--shadow',
    '--game-gradient-start',
    '--game-gradient-end',
  ];
  const themeVars = {};
  varNames.forEach(name => {
    themeVars[toCamelCase(name)] = styles.getPropertyValue(name).trim();
  });
  return themeVars as ThemeColors;
}
