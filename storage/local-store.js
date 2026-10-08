const KEY='ombro-amigo.session.v1';

export function saveSession(session) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function loadSession() {
  try {
    const raw=localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(KEY);
}
