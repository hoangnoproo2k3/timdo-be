import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '~/prisma';
import { FindAllUsersDto } from './dto/find-all-users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getAllUsers({ page, limit, search, role }: FindAllUsersDto) {
    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { email: { contains: search } },
          { username: { contains: search } },
        ],
      }),
      ...(role && { role }),
    };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          googleId: true,
          avatarUrl: true,
          _count: {
            select: {
              posts: true,
              comments: true,
              likes: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const processedUsers = users.map((user) => ({
      ...user,
      loginMethod: user.googleId ? 'GOOGLE' : 'EMAIL',
    }));

    return {
      data: processedUsers,
      meta: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        pageSize: limit,
      },
    };
  }

  async getUserById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        googleId: true,
        avatarUrl: true,
        _count: {
          select: {
            posts: true,
            comments: true,
            likes: true,
            payments: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    return {
      ...user,
      loginMethod: user.googleId ? 'GOOGLE' : 'EMAIL',
    };
  }

  async getUserStats() {
    const totalUsers = await this.prisma.user.count();

    // Thống kê người dùng theo vai trò
    const adminUsers = await this.prisma.user.count({
      where: { role: Role.ADMIN },
    });

    const regularUsers = await this.prisma.user.count({
      where: { role: Role.USER },
    });

    // Thống kê người dùng theo phương thức đăng nhập
    const googleUsers = await this.prisma.user.count({
      where: { googleId: { not: null } },
    });

    const emailUsers = await this.prisma.user.count({
      where: { googleId: null },
    });

    // Người dùng mới trong 7 ngày qua
    const lastWeekDate = new Date();
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);

    const newUsers = await this.prisma.user.count({
      where: {
        createdAt: {
          gte: lastWeekDate,
        },
      },
    });

    return {
      total: totalUsers,
      byRole: {
        admin: adminUsers,
        user: regularUsers,
      },
      byLoginMethod: {
        google: googleUsers,
        email: emailUsers,
      },
      newLastWeek: newUsers,
    };
  }
}
