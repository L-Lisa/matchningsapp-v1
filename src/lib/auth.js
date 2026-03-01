import bcrypt from 'bcryptjs';

const SESSION_KEY = 'coachmatch_session';
const GOOGLE_TOKEN_KEY = 'coachmatch_google_token';

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
export function setSession(googleUser) {
  const session = {
    email: googleUser.email,
    name: googleUser.name,
    loggedInAt: Date.now(),
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
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
  clearGoogleToken();
}

export function isAuthenticated() {
  return getSession() !== null;
}

// Google OAuth-token i localStorage (behöver överleva page refresh)
export function setGoogleToken(token) {
  localStorage.setItem(GOOGLE_TOKEN_KEY, token);
}

export function getGoogleToken() {
  return localStorage.getItem(GOOGLE_TOKEN_KEY);
}

export function clearGoogleToken() {
  localStorage.removeItem(GOOGLE_TOKEN_KEY);
}
