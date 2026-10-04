import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";

jest.mock("bcrypt");

type MockPrisma = {
  user: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

function buildUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "user-1",
    email: null,
    passwordHash: null,
    displayName: null,
    timezone: "UTC",
    authProvider: "GUEST",
    isGuest: true,
    timeIqScore: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("AuthService", () => {
  let service: AuthService;
  let prisma: MockPrisma;
  let jwt: { sign: jest.Mock };

  beforeEach(() => {
    prisma = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    jwt = { sign: jest.fn().mockReturnValue("signed.jwt.token") };
    service = new AuthService(prisma as unknown as PrismaService, jwt as unknown as JwtService);
    jest.clearAllMocks();
    jwt.sign.mockReturnValue("signed.jwt.token");
  });

  describe("createGuest", () => {
    it("creates a guest user and returns a signed token", async () => {
      const user = buildUser();
      prisma.user.create.mockResolvedValue(user);

      const result = await service.createGuest();

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { authProvider: "GUEST", isGuest: true },
      });
      expect(result.accessToken).toBe("signed.jwt.token");
      expect(result.user.id).toBe("user-1");
      expect(result.user.isGuest).toBe(true);
    });
  });

  describe("register", () => {
    it("rejects when email already registered", async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser({ email: "a@b.com" }));

      await expect(
        service.register({ email: "a@b.com", password: "password123" }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("hashes the password and creates an email user", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");
      const created = buildUser({
        email: "a@b.com",
        passwordHash: "hashed-password",
        authProvider: "EMAIL",
        isGuest: false,
      });
      prisma.user.create.mockResolvedValue(created);

      const result = await service.register({ email: "a@b.com", password: "password123" });

      expect(bcrypt.hash).toHaveBeenCalledWith("password123", expect.any(Number));
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: "a@b.com",
          passwordHash: "hashed-password",
          authProvider: "EMAIL",
          isGuest: false,
        }),
      });
      expect(result.user.email).toBe("a@b.com");
      // password hash must never leak into the API response
      expect((result.user as Record<string, unknown>).passwordHash).toBeUndefined();
    });
  });

  describe("login", () => {
    it("rejects unknown email", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ email: "x@y.com", password: "password123" })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it("rejects guest accounts with no password set", async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser({ passwordHash: null }));
      await expect(service.login({ email: "x@y.com", password: "password123" })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it("rejects wrong password", async () => {
      prisma.user.findUnique.mockResolvedValue(buildUser({ passwordHash: "hashed" }));
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login({ email: "x@y.com", password: "wrong" })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it("returns a token for correct credentials", async () => {
      const user = buildUser({ email: "x@y.com", passwordHash: "hashed", isGuest: false, authProvider: "EMAIL" });
      prisma.user.findUnique.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ email: "x@y.com", password: "password123" });
      expect(result.accessToken).toBe("signed.jwt.token");
    });
  });

  describe("linkEmail", () => {
    it("throws if the current user does not exist", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.linkEmail("missing-user", { email: "a@b.com", password: "password123" }),
      ).rejects.toThrow();
    });

    it("rejects linking an email already used by another account", async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(buildUser({ id: "user-1" })) // current user lookup
        .mockResolvedValueOnce(buildUser({ id: "other-user", email: "a@b.com" })); // email collision

      await expect(
        service.linkEmail("user-1", { email: "a@b.com", password: "password123" }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("upgrades a guest account to an email account", async () => {
      prisma.user.findUnique.mockResolvedValueOnce(buildUser({ id: "user-1" })).mockResolvedValueOnce(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");
      const updated = buildUser({
        id: "user-1",
        email: "a@b.com",
        passwordHash: "hashed-password",
        authProvider: "EMAIL",
        isGuest: false,
      });
      prisma.user.update.mockResolvedValue(updated);

      const result = await service.linkEmail("user-1", { email: "a@b.com", password: "password123" });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: expect.objectContaining({
          email: "a@b.com",
          passwordHash: "hashed-password",
          authProvider: "EMAIL",
          isGuest: false,
        }),
      });
      expect(result.user.isGuest).toBe(false);
    });
  });
});
