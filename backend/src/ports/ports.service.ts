import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePortDto } from './dto/create-port.dto';
import { UpdatePortDto } from './dto/update-port.dto';

@Injectable()
export class PortsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreatePortDto) {
    return this.prisma.ports.create({
      data,
    });
  }

  async findAll() {
    return this.prisma.ports.findMany({
      include: {
        currency: true,
        country: true,
      },
    });
  }

  async findOne(id: number) {
    return this.prisma.ports.findUnique({
      where: { id },
      include: {
        currency: true,
        country: true,
      },
    });
  }

  async update(id: number, data: UpdatePortDto) {
    return this.prisma.ports.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    return this.prisma.ports.delete({
      where: { id },
    });
  }
}
