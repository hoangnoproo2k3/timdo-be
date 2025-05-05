import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ServicesService } from './services.service';

@Controller('/v1/services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  async getServices() {
    return this.servicesService.getServices();
  }

  @Get(':id')
  getServiceDetail(@Param('id', ParseIntPipe) id: number) {
    return this.servicesService.getServiceDetail(id);
  }
}
