import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { TenantContextGuard } from '../common/auth/tenant-context.guard';
import type { RequestWithId } from '../common/http/express';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() input: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(input, request);
    const cookie = this.authService.refreshCookie(result.refreshToken);
    response.cookie(cookie.name, cookie.value, cookie.options);
    const { refreshToken: _refreshToken, ...body } = result;
    return body;
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.refresh(request.headers.cookie, request);
    const cookie = this.authService.refreshCookie(result.refreshToken);
    response.cookie(cookie.name, cookie.value, cookie.options);
    const { refreshToken: _refreshToken, ...body } = result;
    return body;
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.authService.logout(request.headers.cookie);
    const cookie = this.authService.clearRefreshCookie();
    response.clearCookie(cookie.name, cookie.options);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(TenantContextGuard)
  me(@Req() request: RequestWithId) {
    return request.pmcsUser;
  }
}
