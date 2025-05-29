import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '~/common/decorators/roles.decorator';
import { JwtRequest } from '~/common/interfaces';
import { JwtAuthGuard, RolesGuard } from '~/modules/auth/guards';
import { FindAllUsersDto } from './dto/find-all-users.dto';
import { UsersService } from './users.service';

@Controller('/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getAllUsers(@Query() findAllUsersDto: FindAllUsersDto) {
    return this.usersService.getAllUsers(findAllUsersDto);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getUserStats() {
    return this.usersService.getUserStats();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@Req() req: JwtRequest) {
    return this.usersService.getUserById(req.user.userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getUserById(
    @Req() req: JwtRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    // Admin có thể xem thông tin của bất kỳ người dùng nào
    // Người dùng thường chỉ có thể xem thông tin của chính mình
    if (req.user.role !== Role.ADMIN && req.user.userId !== id) {
      throw new ForbiddenException('Không có quyền truy cập');
    }

    return this.usersService.getUserById(id);
  }
}
