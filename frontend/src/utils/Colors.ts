export type ThemeColors = {
  body: string;
  accent: string;
  border: string;
  warning: string;
  navHover: string;
  shadow: string;
};

/**
 * Reads all CSS variables from the given element (or body by default)
 * and returns an object with variable names (without --) as keys.
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
    '--nav-hover',
    '--shadow'
  ];
  const themeVars = {};
  varNames.forEach(name => {
    themeVars[name.replace('--', '')] = styles.getPropertyValue(name).trim();
  });
  return themeVars as ThemeColors;
}
