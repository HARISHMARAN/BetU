import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

export interface AuthenticatedUser {
  userId: string;
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const request = ctx.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
  return request.user;
});
