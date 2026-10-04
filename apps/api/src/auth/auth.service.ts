import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import type { User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { AuthResult, toPublicUser } from "./auth.types";

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async createGuest(): Promise<AuthResult> {
    const user = await this.prisma.user.create({
      data: { authProvider: "GUEST", isGuest: true },
    });
    return this.buildAuthResult(user);
  }

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        authProvider: "EMAIL",
        isGuest: false,
      },
    });

    return this.buildAuthResult(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user?.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.buildAuthResult(user);
  }

  /** Upgrades a guest account to an email account (spec section 17: "Save your Time DNA across devices"). */
  async linkEmail(userId: string, dto: RegisterDto): Promise<AuthResult> {
    const currentUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) {
      throw new NotFoundException("User not found");
    }

    const emailOwner = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (emailOwner && emailOwner.id !== userId) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName ?? currentUser.displayName,
        authProvider: "EMAIL",
        isGuest: false,
      },
    });

    return this.buildAuthResult(updated);
  }

  private buildAuthResult(user: User): AuthResult {
    const accessToken = this.jwt.sign({ sub: user.id });
    return { accessToken, user: toPublicUser(user) };
  }
}
