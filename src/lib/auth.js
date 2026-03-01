import bcrypt from 'bcryptjs';

const SESSION_KEY = 'coachmatch_session';

// Validera lösenord mot bcrypt-hash i .env
export async function validatePassword(password) {
  const hash = import.meta.env.VITE_APP_PASSWORD_HASH;
  if (!hash) {
    console.error('VITE_APP_PASSWORD_HASH saknas i .env');
    return false;
  }
  return bcrypt.compare(password, hash);
}

// Session i sessionStorage (lever tills webbläsaren stängs)
export function setSession() {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ loggedInAt: Date.now() }));
}

export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function isAuthenticated() {
  return getSession() !== null;
}
