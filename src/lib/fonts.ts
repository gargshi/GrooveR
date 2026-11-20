import { FontOption } from '../types/music';

export interface FontPreset {
  id: FontOption;
  label: string;
  description: string;
  cssStack: string;
}

export const FONT_PRESETS: FontPreset[] = [
  {
    id: 'system',
    label: 'System Default',
    description: 'Native OnePlus OxygenOS / Android device font',
    cssStack: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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

export function applyAppFont(fontOption: FontOption): void {
  const preset = FONT_PRESETS.find((f) => f.id === fontOption) ?? FONT_PRESETS[0];
  document.documentElement.style.setProperty('--font-sans', preset.cssStack);
  document.documentElement.style.setProperty('--font-display', preset.cssStack);
}
