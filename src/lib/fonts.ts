import { ButtonColorScheme, FontOption, UiScaleOption } from '../types/music';

export interface FontPreset {
  id: FontOption;
  label: string;
  description: string;
  cssStack: string;
  letterSpacing?: string;
}

export const FONT_PRESETS: FontPreset[] = [
  {
    id: 'system',
    label: 'System Default',
    description: 'Native OnePlus OxygenOS / Android device font',
    cssStack: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  {
    id: 'arial',
    label: 'Arial',
    description: 'Classic crisp sans-serif (Arial / Helvetica)',
    cssStack: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
  },
  {
    id: 'apple-music',
    label: 'Apple Music Style',
    description: 'SF Pro / clean neo-grotesque Apple Music look',
    cssStack:
      '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "DM Sans", "Helvetica Neue", Arial, sans-serif',
    letterSpacing: '-0.015em',
  },
  {
    id: 'jakarta',
    label: 'Plus Jakarta Sans',
    description: 'Geometric modern display sans',
    cssStack: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
  },
  {
    id: 'manrope',
    label: 'Manrope',
    description: 'Clean high-legibility dark UI sans',
    cssStack: '"Manrope", system-ui, -apple-system, sans-serif',
  },
  {
    id: 'serif',
    label: 'Editorial Serif',
    description: 'Classic high-contrast serif typography',
    cssStack: 'Georgia, Cambria, "Times New Roman", Times, serif',
  },
  {
    id: 'mono',
    label: 'JetBrains Mono',
    description: 'Technical monospace across titles and lists',
    cssStack: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
  },
];

export interface UiScalePreset {
  value: UiScaleOption;
  label: string;
  percentLabel: string;
}

export const UI_SCALE_PRESETS: UiScalePreset[] = [
  { value: 0.85, label: 'Compact', percentLabel: '85%' },
  { value: 0.92, label: 'Snug', percentLabel: '92%' },
  { value: 1, label: 'Default', percentLabel: '100%' },
  { value: 1.1, label: 'Large', percentLabel: '110%' },
  { value: 1.2, label: 'XL', percentLabel: '120%' },
];

export function applyAppFont(fontOption: FontOption): void {
  const preset = FONT_PRESETS.find((f) => f.id === fontOption) ?? FONT_PRESETS[0];
  document.documentElement.style.setProperty('--font-sans', preset.cssStack);
  document.documentElement.style.setProperty('--font-display', preset.cssStack);
  document.body.style.letterSpacing = preset.letterSpacing ?? '';
}

export function applyUiScale(scale: UiScaleOption): void {
  const safeScale = UI_SCALE_PRESETS.some((p) => p.value === scale) ? scale : 1;
  document.documentElement.style.fontSize = `${Math.round(safeScale * 1000) / 10}%`;
}

export interface ButtonColorPreset {
  id: ButtonColorScheme;
  label: string;
  primary: string;
  hover: string;
  soft: string;
  contrast: string;
  tint: string;
  border: string;
  glow: string;
  dim: string;
}

export const BUTTON_COLOR_PRESETS: ButtonColorPreset[] = [
  {
    id: 'blue',
    label: 'Studio Blue',
    primary: '#2E8BFF',
    hover: '#1E7AE8',
    soft: '#64AEFF',
    contrast: '#FFFFFF',
    tint: 'rgba(46, 139, 255, 0.16)',
    border: 'rgba(46, 139, 255, 0.44)',
    glow: 'rgba(46, 139, 255, 0.28)',
    dim: 'rgba(46, 139, 255, 0.55)',
  },
  {
    id: 'cyan',
    label: 'Metro Cyan',
    primary: '#1BA1E2',
    hover: '#1489C4',
    soft: '#5CC4F5',
    contrast: '#FFFFFF',
    tint: 'rgba(27, 161, 226, 0.16)',
    border: 'rgba(27, 161, 226, 0.48)',
    glow: 'rgba(27, 161, 226, 0.28)',
    dim: 'rgba(27, 161, 226, 0.55)',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    primary: '#059669',
    hover: '#047857',
    soft: '#34D399',
    contrast: '#FFFFFF',
    tint: 'rgba(5, 150, 105, 0.16)',
    border: 'rgba(5, 150, 105, 0.45)',
    glow: 'rgba(5, 150, 105, 0.28)',
    dim: 'rgba(5, 150, 105, 0.55)',
  },
  {
    id: 'crimson',
    label: 'Crimson',
    primary: '#E11D48',
    hover: '#BE123C',
    soft: '#FB7185',
    contrast: '#FFFFFF',
    tint: 'rgba(225, 29, 72, 0.16)',
    border: 'rgba(225, 29, 72, 0.45)',
    glow: 'rgba(225, 29, 72, 0.28)',
    dim: 'rgba(225, 29, 72, 0.55)',
  },
  {
    id: 'amber',
    label: 'Amber Gold',
    primary: '#F59E0B',
    hover: '#D97706',
    soft: '#FBBF24',
    contrast: '#090A0D',
    tint: 'rgba(245, 158, 11, 0.16)',
    border: 'rgba(245, 158, 11, 0.45)',
    glow: 'rgba(245, 158, 11, 0.28)',
    dim: 'rgba(245, 158, 11, 0.55)',
  },
  {
    id: 'orange',
    label: 'Tangerine',
    primary: '#EA580C',
    hover: '#C2410C',
    soft: '#FB923C',
    contrast: '#FFFFFF',
    tint: 'rgba(234, 88, 12, 0.16)',
    border: 'rgba(234, 88, 12, 0.45)',
    glow: 'rgba(234, 88, 12, 0.28)',
    dim: 'rgba(234, 88, 12, 0.55)',
  },
];

export function applyButtonColorScheme(scheme: ButtonColorScheme): void {
  const preset = BUTTON_COLOR_PRESETS.find((p) => p.id === scheme) ?? BUTTON_COLOR_PRESETS[0];
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--accent-primary', preset.primary);
  rootStyle.setProperty('--accent-hover', preset.hover);
  rootStyle.setProperty('--accent-soft', preset.soft);
  rootStyle.setProperty('--accent-contrast', preset.contrast);
  rootStyle.setProperty('--accent-tint', preset.tint);
  rootStyle.setProperty('--accent-border', preset.border);
  rootStyle.setProperty('--accent-glow', preset.glow);
  rootStyle.setProperty('--accent-dim', preset.dim);
}
