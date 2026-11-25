import { FontOption, UiScaleOption } from '../types/music';

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
