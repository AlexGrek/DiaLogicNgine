export type FontCategory = 'legacy' | 'sans' | 'serif' | 'handwritten' | 'monospace' | 'fancy'

export interface FontOption {
  id: string
  label: string
  css: string
  category: FontCategory
}

export const FONT_OPTIONS: FontOption[] = [
  // ── Legacy (bundled game fonts) ───────────────────────────────────────────
  { id: 'involve',        label: 'Involve',          css: '"Involve", sans-serif',                                   category: 'legacy' },
  { id: 'palanquin',      label: 'Palanquin',        css: '"PalanquinRegular", sans-serif',                          category: 'legacy' },
  { id: 'm-plus-1p',      label: 'M PLUS 1p (Thin)', css: '"M PLUS 1p", sans-serif',                                 category: 'legacy' },

  // ── Sans ──────────────────────────────────────────────────────────────────
  { id: 'outfit',         label: 'Outfit',           css: '"Outfit Variable", "Outfit", sans-serif',                   category: 'sans' },
  { id: 'inter',          label: 'Inter',            css: '"Inter Variable", "Inter", sans-serif',                     category: 'sans' },
  { id: 'space-grotesk',  label: 'Space Grotesk',    css: '"Space Grotesk Variable", "Space Grotesk", sans-serif',     category: 'sans' },
  { id: 'raleway',        label: 'Raleway',          css: '"Raleway Variable", "Raleway", sans-serif',                 category: 'sans' },
  { id: 'poppins',        label: 'Poppins',          css: '"Poppins", sans-serif',                                     category: 'sans' },
  { id: 'nunito',         label: 'Nunito',           css: '"Nunito Variable", "Nunito", sans-serif',                   category: 'sans' },
  { id: 'dm-sans',        label: 'DM Sans',          css: '"DM Sans Variable", "DM Sans", sans-serif',                 category: 'sans' },
  { id: 'manrope',        label: 'Manrope',          css: '"Manrope Variable", "Manrope", sans-serif',                 category: 'sans' },

  // ── Serif ─────────────────────────────────────────────────────────────────
  { id: 'playfair',       label: 'Playfair Display', css: '"Playfair Display Variable", "Playfair Display", serif',   category: 'serif' },
  { id: 'lora',           label: 'Lora',             css: '"Lora Variable", "Lora", serif',                           category: 'serif' },
  { id: 'merriweather',   label: 'Merriweather',     css: '"Merriweather", serif',                                    category: 'serif' },
  { id: 'eb-garamond',    label: 'EB Garamond',      css: '"EB Garamond Variable", "EB Garamond", serif',             category: 'serif' },
  { id: 'libre-baskerville', label: 'Libre Baskerville', css: '"Libre Baskerville", serif',                          category: 'serif' },
  { id: 'pt-serif',       label: 'PT Serif',         css: '"PT Serif", serif',                                        category: 'serif' },
  { id: 'crimson-pro',    label: 'Crimson Pro',      css: '"Crimson Pro", serif',                                     category: 'serif' },

  // ── Handwritten ───────────────────────────────────────────────────────────
  { id: 'dancing-script', label: 'Dancing Script',   css: '"Dancing Script Variable", "Dancing Script", cursive',    category: 'handwritten' },
  { id: 'caveat',         label: 'Caveat',           css: '"Caveat Variable", "Caveat", cursive',                    category: 'handwritten' },
  { id: 'pacifico',       label: 'Pacifico',         css: '"Pacifico", cursive',                                     category: 'handwritten' },
  { id: 'kalam',          label: 'Kalam',            css: '"Kalam", cursive',                                        category: 'handwritten' },
  { id: 'sacramento',     label: 'Sacramento',       css: '"Sacramento", cursive',                                   category: 'handwritten' },
  { id: 'satisfy',        label: 'Satisfy',          css: '"Satisfy", cursive',                                      category: 'handwritten' },
  { id: 'patrick-hand',   label: 'Patrick Hand',     css: '"Patrick Hand", cursive',                                 category: 'handwritten' },

  // ── Monospace ─────────────────────────────────────────────────────────────
  { id: 'jetbrains-mono', label: 'JetBrains Mono',   css: '"JetBrains Mono Variable", "JetBrains Mono", monospace',  category: 'monospace' },
  { id: 'fira-code',      label: 'Fira Code',        css: '"Fira Code Variable", "Fira Code", monospace',            category: 'monospace' },
  { id: 'source-code-pro',label: 'Source Code Pro',  css: '"Source Code Pro Variable", "Source Code Pro", monospace',category: 'monospace' },
  { id: 'space-mono',     label: 'Space Mono',       css: '"Space Mono", monospace',                                 category: 'monospace' },
  { id: 'inconsolata',    label: 'Inconsolata',      css: '"Inconsolata Variable", "Inconsolata", monospace',        category: 'monospace' },
  { id: 'ibm-plex-mono',  label: 'IBM Plex Mono',    css: '"IBM Plex Mono", monospace',                             category: 'monospace' },
  { id: 'courier-prime',  label: 'Courier Prime',    css: '"Courier Prime", monospace',                             category: 'monospace' },

  // ── Fancy ─────────────────────────────────────────────────────────────────
  { id: 'bebas-neue',     label: 'Bebas Neue',       css: '"Bebas Neue", sans-serif',                                category: 'fancy' },
  { id: 'oswald',         label: 'Oswald',           css: '"Oswald Variable", "Oswald", sans-serif',                 category: 'fancy' },
  { id: 'abril-fatface',  label: 'Abril Fatface',    css: '"Abril Fatface", serif',                                  category: 'fancy' },
  { id: 'righteous',      label: 'Righteous',        css: '"Righteous", sans-serif',                                 category: 'fancy' },
  { id: 'lobster',        label: 'Lobster',          css: '"Lobster", cursive',                                      category: 'fancy' },
  { id: 'orbitron',       label: 'Orbitron',         css: '"Orbitron Variable", "Orbitron", sans-serif',             category: 'fancy' },
  { id: 'permanent-marker', label: 'Permanent Marker', css: '"Permanent Marker", cursive',                          category: 'fancy' },
]

export type FontId = typeof FONT_OPTIONS[number]['id']

export const DEFAULT_FONT_ID: FontId = 'outfit'

/** In-game menu and start screen — Involve (light/thin UI font). */
export const DEFAULT_MENU_FONT_ID: FontId = 'involve'

/** Dialog body text — Palanquin. */
export const DEFAULT_TEXT_FONT_ID: FontId = 'palanquin'

/** Choice / response buttons — Palanquin (matches current player). */
export const DEFAULT_RESPONSES_FONT_ID: FontId = 'palanquin'

export const FONT_CSS: Record<FontId, string> = Object.fromEntries(
  FONT_OPTIONS.map((f) => [f.id, f.css]),
) as Record<FontId, string>

export function isFontId(value: unknown): value is FontId {
  return typeof value === 'string' && value in FONT_CSS
}

export function resolveFontCss(fontId: FontId | undefined): string | undefined {
  if (!fontId) return undefined
  return FONT_CSS[fontId]
}

export const FONT_CATEGORIES: { id: FontCategory; label: string }[] = [
  { id: 'legacy',      label: 'Legacy'      },
  { id: 'sans',        label: 'Sans-Serif'  },
  { id: 'serif',       label: 'Serif'       },
  { id: 'handwritten', label: 'Handwritten' },
  { id: 'monospace',   label: 'Monospace'   },
  { id: 'fancy',       label: 'Fancy'       },
]
