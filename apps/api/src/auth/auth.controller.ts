import { Body, Controller, HttpCode, HttpStatus, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser, type AuthenticatedUser } from "../common/decorators/current-user.decorator";
import { AuthResult } from "./auth.types";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("guest")
  @HttpCode(HttpStatus.CREATED)
  createGuest(): Promise<AuthResult> {
    return this.authService.createGuest();
  }

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto): Promise<AuthResult> {
    return this.authService.register(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthResult> {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("link-email")
  linkEmail(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterDto): Promise<AuthResult> {
    return this.authService.linkEmail(user.userId, dto);
  }
}
