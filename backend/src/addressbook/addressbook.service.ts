import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressBookDto, UpdateAddressBookDto } from './dto/address-book.dto.ts';

@Injectable()
export class AddressbookService {
  constructor(private readonly prisma: PrismaService) {}

 async create(dto: CreateAddressBookDto) {
  const {
    bankDetails = [],
    businessPorts = [],
    contacts = [],
    remark="",
    ...scalarFields
  } = dto;

  // STEP 1: Get latest refId
  const latestEntry = await this.prisma.addressBook.findFirst({
    where: {
      refId: { startsWith: 'RST/CUS/' },
    },
    orderBy: {
      id: 'desc',
    },
    select: {
      refId: true,
    },
  });

  // STEP 2: Extract the last number and increment
  let newRefId = 'RST/CUS/00001';
  if (latestEntry?.refId) {
    const lastNumber = parseInt(latestEntry.refId.split('/').pop() || '0', 10);
    const nextNumber = (lastNumber + 1).toString().padStart(5, '0');
    newRefId = `RST/CUS/${nextNumber}`;
  }

  return this.prisma.addressBook.create({
    data: {
      ...scalarFields,
      remark,
      refId: newRefId,
      bankDetails: { create: bankDetails },
      businessPorts: {
        create: businessPorts.map((bp) => ({
          port: { connect: { id: bp.portId } },
        })),
      },
      contacts: { create: contacts },
    },
    include: {
      bankDetails: true,
      businessPorts: { include: { port: true } },
      contacts: true,
      country: true,
    },
  });
}


async getNextRefId(): Promise<{ refId: string }> {
  const latestEntry = await this.prisma.addressBook.findFirst({
    where: {
      refId: { startsWith: 'RST/CUS/' },
    },
    orderBy: { id: 'desc' },
    select: { refId: true },
  });

  let nextRefId = 'RST/CUS/00001';
  if (latestEntry?.refId) {
    const lastNumber = parseInt(latestEntry.refId.split('/').pop() || '0', 10);
    nextRefId = `RST/CUS/${(lastNumber + 1).toString().padStart(5, '0')}`;
  }

  return { refId: nextRefId };
}

  findAll() {
    return this.prisma.addressBook.findMany({
      include: {
        bankDetails: true,
        businessPorts: { include: { port: true } },
        contacts: true,
        country: true,
      },
    });
  }

  findOne(id: number) {
    return this.prisma.addressBook.findUnique({
      where: { id },
      include: {
        bankDetails: true,
        businessPorts: { include: { port: true } },
        contacts: true,
        country: true,
      },
    });
  }

  async update(id: number, dto: UpdateAddressBookDto) {
    const { bankDetails, businessPorts, contacts, ...rest } = dto;

    return this.prisma.addressBook.update({
      where: { id },
      data: {
        ...rest,
        bankDetails: bankDetails && { deleteMany: {}, create: bankDetails },
        businessPorts: businessPorts && { deleteMany: {}, create: businessPorts },
        contacts: contacts && { deleteMany: {}, create: contacts },
      },
      include: { bankDetails: true, businessPorts: { include: { port: true } }, contacts: true, country: true },
    });
  }

 async remove(id: number) {
  // 1. Delete related contacts
  await this.prisma.contacts.deleteMany({
    where: { addressBookId: id },
  });

  // 2. Delete related business ports
  await this.prisma.businessPorts.deleteMany({
    where: { addressBookId: id },
  });

  // 3. Delete related bank details
  await this.prisma.bankDetails.deleteMany({
    where: { addressBookId: id },
  });

  // 4. Finally delete the address book entry
  return this.prisma.addressBook.delete({
    where: { id },
  });
}

}
