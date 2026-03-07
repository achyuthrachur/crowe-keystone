import { create } from 'zustand';

const TOKEN_KEY = 'keystone_token';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  team_id: string | null;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setToken: (token: string, user: AuthUser) => void;
  clearToken: () => void;
  getToken: () => string | null;
}

function loadToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: loadToken(),
  user: null,
  isAuthenticated: !!loadToken(),

  setToken: (token, user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
    }
    set({ token, user, isAuthenticated: true });
  },

  clearToken: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
    }
    set({ token: null, user: null, isAuthenticated: false });
  },

  getToken: () => get().token,
}));

/** Read JWT from localStorage without going through React. Safe to call outside components. */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}
