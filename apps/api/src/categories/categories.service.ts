import { ConflictException, Injectable } from "@nestjs/common";
import type { Category } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCategoryDto } from "./dto/create-category.dto";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(userId: string): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { OR: [{ userId: null }, { userId }] },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
  }

  async createForUser(userId: string, dto: CreateCategoryDto): Promise<Category> {
    const existing = await this.prisma.category.findFirst({
      where: { userId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException("Category already exists");
    }

    return this.prisma.category.create({
      data: { userId, name: dto.name, icon: dto.icon, isDefault: false },
    });
  }
}
