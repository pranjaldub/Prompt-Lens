const KEY = "promptlens.history.v1";
const MAX = 25;

export function loadHistory() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveHistoryItem(item) {
  const list = loadHistory();
  const entry = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), createdAt: Date.now(), ...item };
  const next = [entry, ...list].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* ignore quota */ }
  return entry;
}

export function deleteHistoryItem(id) {
  const next = loadHistory().filter((x) => x.id !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearHistory() {
  localStorage.removeItem(KEY);
}
