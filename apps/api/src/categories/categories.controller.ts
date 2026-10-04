import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import type { Category } from "@prisma/client";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";

@UseGuards(JwtAuthGuard)
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<Category[]> {
    return this.categoriesService.listForUser(user.userId);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCategoryDto): Promise<Category> {
    return this.categoriesService.createForUser(user.userId, dto);
  }
}
