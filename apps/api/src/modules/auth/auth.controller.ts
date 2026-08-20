import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/auth/current-user.decorator'
import type { AuthenticatedUser } from '../../common/auth/current-user.decorator'
import { Public } from '../../common/auth/public.decorator'
import { AuthRateLimitGuard } from '../../common/rate-limit/auth-rate-limit.guard'
import type { AuthService } from './auth.service'
import type { LoginDto } from './dto/login.dto'
import type { RefreshDto } from './dto/refresh.dto'
import type { RegisterDto } from './dto/register.dto'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @UseGuards(AuthRateLimitGuard)
  @Post('register')
  async register(@Body() body: RegisterDto): Promise<{ id: string }> {
    return this.auth.register(body.email, body.password, body.displayName)
  }

  @Public()
  @UseGuards(AuthRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.auth.login(body.email, body.password)
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Body() body: RefreshDto) {
    return this.auth.refresh(body.refreshToken)
  }

  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(
    @Body() body: RefreshDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.auth.logout(body.refreshToken, user.id)
  }

  @ApiBearerAuth()
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user.id)
  }
}