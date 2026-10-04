import { create } from "zustand";
import { authApi } from "../api/client";
import type { PublicUser } from "../api/types";
import { clearCachedUser, clearToken, getCachedUser, getToken, setCachedUser, setToken } from "../storage/tokenStorage";

interface AuthState {
  user: PublicUser | null;
  isBootstrapping: boolean;
  bootstrapError: string | null;
  bootstrap: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  register: (dto: { email: string; password: string; displayName?: string }) => Promise<void>;
  login: (dto: { email: string; password: string }) => Promise<void>;
  linkEmail: (dto: { email: string; password: string; displayName?: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isBootstrapping: true,
  bootstrapError: null,

  /**
   * Spec section 17: a user should start their first Bet without being
   * forced through account creation. On cold start we reuse any stored
   * session, or silently mint a guest account.
   */
  bootstrap: async () => {
    set({ isBootstrapping: true, bootstrapError: null });
    try {
      const [token, cachedUser] = await Promise.all([getToken(), getCachedUser()]);
      if (token && cachedUser) {
        set({ user: cachedUser, isBootstrapping: false });
        return;
      }

      const result = await authApi.guest();
      await Promise.all([setToken(result.accessToken), setCachedUser(result.user)]);
      set({ user: result.user, isBootstrapping: false });
    } catch (error) {
      set({
        isBootstrapping: false,
        bootstrapError: error instanceof Error ? error.message : "Could not start BetU",
      });
    }
  },

  signInAsGuest: async () => {
    const result = await authApi.guest();
    await Promise.all([setToken(result.accessToken), setCachedUser(result.user)]);
    set({ user: result.user });
  },

  register: async (dto) => {
    const result = await authApi.register(dto);
    await Promise.all([setToken(result.accessToken), setCachedUser(result.user)]);
    set({ user: result.user });
  },

  login: async (dto) => {
    const result = await authApi.login(dto);
    await Promise.all([setToken(result.accessToken), setCachedUser(result.user)]);
    set({ user: result.user });
  },

  linkEmail: async (dto) => {
    const result = await authApi.linkEmail(dto);
    await Promise.all([setToken(result.accessToken), setCachedUser(result.user)]);
    set({ user: result.user });
  },

  signOut: async () => {
    await Promise.all([clearToken(), clearCachedUser()]);
    set({ user: null });
  },
}));
