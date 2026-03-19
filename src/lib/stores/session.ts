import type { SessionSettings, CurrentSession } from '$lib/types';

const SETTINGS_KEY = 'mt_session_settings';
const SESSION_KEY = 'mt_current_session';
const PREV_SESSION_KEY = 'mt_prev_session';

export function saveSessionSettings(settings: SessionSettings): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadSessionSettings(): SessionSettings | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); }
  catch { return null; }
}

export function saveCurrentSession(session: CurrentSession): void {
  if (typeof localStorage === 'undefined') return;
  // Save current as previous before overwriting
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) {
    localStorage.setItem(PREV_SESSION_KEY, existing);
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadCurrentSession(): CurrentSession | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); }
  catch { return null; }
}

export function loadPreviousSession(): CurrentSession | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(PREV_SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); }
  catch { return null; }
}
