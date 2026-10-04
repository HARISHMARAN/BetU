import * as SecureStore from "expo-secure-store";
import type { PublicUser } from "../api/types";

const TOKEN_KEY = "betu_access_token";
const USER_KEY = "betu_cached_user";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getCachedUser(): Promise<PublicUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  return raw ? (JSON.parse(raw) as PublicUser) : null;
}

export async function setCachedUser(user: PublicUser): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function clearCachedUser(): Promise<void> {
  await SecureStore.deleteItemAsync(USER_KEY);
}
