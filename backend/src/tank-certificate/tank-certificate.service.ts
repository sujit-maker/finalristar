import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { CertificateDto } from './dto/createTankCertificate.dto';
import { UpdateCertificateDto } from './dto/updateTankCertificate.dto';

@Injectable()
export class TankCertificateService {
  constructor(private prisma: PrismaService) {}

  create(data: CertificateDto & { certificate?: string }) {
    return this.prisma.periodicTankCertificates.create({
      data: {
        ...data,
        inspectionDate: data.inspectionDate
          ? new Date(data.inspectionDate).toISOString()
          : undefined,
        nextDueDate: data.nextDueDate
          ? new Date(data.nextDueDate).toISOString()
          : undefined,
        inventoryId:
          typeof data.inventoryId === 'string'
            ? parseInt(data.inventoryId, 10)
            : data.inventoryId,
      },
    });
  }

  findAll() {
    return this.prisma.periodicTankCertificates.findMany();
  }

  findOne(id: number) {
    return this.prisma.periodicTankCertificates.findUnique({ where: { id } });
  }

 update(id: number, data: UpdateCertificateDto & { certificate?: string }) {
  const formattedData: any = {};

  if (data.inspectionDate) {
    formattedData.inspectionDate = new Date(data.inspectionDate).toISOString();
  }

  if (data.nextDueDate) {
    formattedData.nextDueDate = new Date(data.nextDueDate).toISOString();
  }

  if (data.certificate !== undefined) {
    formattedData.certificate = data.certificate;
  }

  return this.prisma.periodicTankCertificates.update({
    where: { id },
    data: formattedData,
  });
}


  remove(id: number) {
    return this.prisma.periodicTankCertificates.delete({ where: { id } });
  }
}