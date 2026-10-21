import type { BoardStyle } from './types';
import { DEFAULT_TABLE_THEME, TABLE_THEMES } from '../../shared/theme/tableThemes';
import type { TableThemeId } from '../../shared/theme/tableThemes';

const KEY = 'game-board:catan-look';

export interface LookPrefs {
  boardStyle: BoardStyle;
  tableTheme: TableThemeId;
}

const DEFAULTS: LookPrefs = { boardStyle: 'classic', tableTheme: DEFAULT_TABLE_THEME };

/** The visual choices (board style, table colour) survive a refresh. Storage can be blocked, so every access is guarded. */
export function loadLook(): LookPrefs {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<LookPrefs>;
    return {
      boardStyle: parsed.boardStyle === 'tavern' || parsed.boardStyle === 'classic' ? parsed.boardStyle : DEFAULTS.boardStyle,
      tableTheme: TABLE_THEMES.some((t) => t.id === parsed.tableTheme) ? (parsed.tableTheme as TableThemeId) : DEFAULTS.tableTheme,
    };
  } catch {
    return DEFAULTS;
  }
}

export function saveLook(look: LookPrefs): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(look));
  } catch {
    // Not saving is fine; the choice just lasts for this page.
  }
}
