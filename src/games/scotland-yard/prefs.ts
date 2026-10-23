import { DEFAULT_TABLE_THEME, TABLE_THEMES } from '../../shared/theme/tableThemes';
import type { TableThemeId } from '../../shared/theme/tableThemes';

const KEY = 'game-board:scotland-yard-look';

export interface LookPrefs {
  tableTheme: TableThemeId;
}

/** The table colour survives a refresh. Storage can be blocked, so every access is guarded. */
export function loadLook(): LookPrefs {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<LookPrefs>) : {};
    return { tableTheme: TABLE_THEMES.some((t) => t.id === parsed.tableTheme) ? (parsed.tableTheme as TableThemeId) : DEFAULT_TABLE_THEME };
  } catch {
    return { tableTheme: DEFAULT_TABLE_THEME };
  }
}

export function saveLook(look: LookPrefs): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(look));
  } catch {
    // Not saving is fine; the choice just lasts for this page.
  }
}
