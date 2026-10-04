import { ConflictException } from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { PrismaService } from "../prisma/prisma.service";

type MockPrisma = {
  category: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
  };
};

describe("CategoriesService", () => {
  let service: CategoriesService;
  let prisma: MockPrisma;

  beforeEach(() => {
    prisma = {
      category: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };
    service = new CategoriesService(prisma as unknown as PrismaService);
  });

  describe("listForUser", () => {
    it("returns global defaults and the user's own categories together", async () => {
      prisma.category.findMany.mockResolvedValue([
        { id: "c1", userId: null, name: "Study", isDefault: true },
        { id: "c2", userId: "user-1", name: "Side Hustle", isDefault: false },
      ]);

      const result = await service.listForUser("user-1");

      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { OR: [{ userId: null }, { userId: "user-1" }] },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });
      expect(result).toHaveLength(2);
    });
  });

  describe("createForUser", () => {
    it("rejects a duplicate name for the same user", async () => {
      prisma.category.findFirst.mockResolvedValue({ id: "existing", name: "Side Hustle" });

      await expect(service.createForUser("user-1", { name: "Side Hustle" })).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.category.create).not.toHaveBeenCalled();
    });

    it("creates a custom category owned by the user", async () => {
      prisma.category.findFirst.mockResolvedValue(null);
      const created = { id: "c3", userId: "user-1", name: "Side Hustle", isDefault: false, icon: null };
      prisma.category.create.mockResolvedValue(created);

      const result = await service.createForUser("user-1", { name: "Side Hustle" });

      expect(prisma.category.create).toHaveBeenCalledWith({
        data: { userId: "user-1", name: "Side Hustle", icon: undefined, isDefault: false },
      });
      expect(result).toEqual(created);
    });
  });
});
