"use client";

const TOKEN_KEY = "lms.jwt";
const USER_KEY = "lms.user";

/** Same-tab notification when the session changes. The 'storage' DOM
 *  event only fires in OTHER tabs, so without this the header (Sign
 *  in button, nav links) doesn't react when you log in or out in the
 *  same tab. */
export const SESSION_CHANGED_EVENT = "lms:session-changed";

function emitChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SESSION_CHANGED_EVENT));
}

export type Session = {
  token: string;
  userId: string;
  email: string;
  displayName: string | null;
  roles: string[];
  expiresAt: number;
};

type Claims = {
  sub?: string;
  email?: string;
  name?: string;
  roles?: string[];
  exp?: number;
};

function decode(token: string): Claims {
  try {
    const payload = token.split(".")[1];
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(json) as Claims;
  } catch {
    return {};
  }
}

export function saveSession(token: string, fallbackEmail?: string) {
  if (typeof window === "undefined") return;
  const claims = decode(token);
  const session: Session = {
    token,
    userId: claims.sub ?? "",
    email: claims.email ?? fallbackEmail ?? "",
    displayName: claims.name ?? null,
    roles: claims.roles ?? [],
    expiresAt: (claims.exp ?? 0) * 1000,
  };
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(session));
  emitChange();
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  const raw = localStorage.getItem(USER_KEY);
  if (!token || !raw) return null;
  try {
    const session = JSON.parse(raw) as Session;
    if (session.expiresAt && session.expiresAt < Date.now()) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  emitChange();
}

export function hasRole(role: string): boolean {
  return getSession()?.roles.includes(role) ?? false;
}
