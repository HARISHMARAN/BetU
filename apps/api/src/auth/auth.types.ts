import type { AuthProvider, User } from "@prisma/client";

export interface PublicUser {
  id: string;
  email: string | null;
  displayName: string | null;
  isGuest: boolean;
  authProvider: AuthProvider;
  timeIqScore: number;
}

export interface AuthResult {
  accessToken: string;
  user: PublicUser;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    isGuest: user.isGuest,
    authProvider: user.authProvider,
    timeIqScore: user.timeIqScore,
  };
}
