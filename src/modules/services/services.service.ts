import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '~/prisma';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async getServices() {
    const services = await this.prisma.servicePackage.findMany({});
    return services.map((service) => ({
      ...service,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      features: service.features ? JSON.parse(service.features) : [],
    }));
  }

  async getServiceDetail(serviceId: number) {
    const service = await this.prisma.servicePackage.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }
}
