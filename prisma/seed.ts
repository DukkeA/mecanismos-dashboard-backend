import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { hash } from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  CustomerDocumentType,
  PrismaClient,
  SupplierDocumentType,
  SupplierType,
} from '../generated/prisma/client';

const BCRYPT_ROUNDS = 12;

const SEED_USERS = [
  {
    email: 'admin@mecanismos.test',
    name: 'Admin Mecanismos',
    password: 'Admin123!',
    role: 'ADMIN' as const,
  },
  {
    email: 'ventas@mecanismos.test',
    name: 'Ventas Mecanismos',
    password: 'Ventas123!',
    role: 'SALES' as const,
  },
  {
    email: 'mecanico@mecanismos.test',
    name: 'Mecanico Mecanismos',
    password: 'Mecanico123!',
    role: 'MECHANIC' as const,
  },
];

const SEED_CUSTOMERS = [
  {
    id: 'seed-customer-acme-industrial',
    name: 'Acme Industrial SAS',
    phone: '3001234567',
    documentType: CustomerDocumentType.NIT,
    documentNumber: '900123456',
    email: 'compras@acme-industrial.test',
    notes: '<p>Cliente de muestra para activos industriales.</p>',
  },
  {
    id: 'seed-customer-ana-gomez',
    name: 'Ana Gomez',
    phone: '3109876543',
    documentType: CustomerDocumentType.CEDULA,
    documentNumber: '123456789',
    email: 'ana.gomez@mecanismos.test',
    notes: '<p>Cliente de muestra para flujo comercial.</p>',
  },
] as const;

const SEED_VEHICLES = [
  {
    id: 'seed-vehicle-acme-foton-aumark',
    customerId: 'seed-customer-acme-industrial',
    brand: 'Foton',
    modelReference: 'Aumark BJ1049',
    plate: 'ABC123',
    notes: 'Vehiculo de reparto para pruebas de customer-assets.',
  },
  {
    id: 'seed-vehicle-ana-hilux',
    customerId: 'seed-customer-ana-gomez',
    brand: 'Toyota',
    modelReference: 'Hilux 2.8',
    plate: 'XYZ987',
    notes: 'Vehiculo personal de muestra.',
  },
] as const;

const SEED_COMPONENT_TYPES = [
  {
    id: 'seed-component-type-inyector',
    name: 'Inyector',
    slug: 'inyector',
    description: 'Inyectores diesel para pruebas y recepcion comercial.',
    isActive: true,
  },
  {
    id: 'seed-component-type-bomba-inyeccion',
    name: 'Bomba de inyección',
    slug: 'bomba-de-inyeccion',
    description: 'Bombas de inyección para diagnóstico y trazabilidad.',
    isActive: true,
  },
  {
    id: 'seed-component-type-tobera',
    name: 'Tobera',
    slug: 'tobera',
    description: 'Toberas de muestra para catálogo inicial.',
    isActive: true,
  },
] as const;

const SEED_COMPONENTS = [
  {
    id: 'seed-component-acme-inyector',
    customerId: 'seed-customer-acme-industrial',
    vehicleId: 'seed-vehicle-acme-foton-aumark',
    componentTypeId: 'seed-component-type-inyector',
    brand: 'Bosch',
    reference: '0445120231',
    identifier: 'INY-ACME-001',
    notes: 'Inyector ligado al vehiculo Acme para validar ownership y filtros.',
  },
  {
    id: 'seed-component-ana-tobera',
    customerId: 'seed-customer-ana-gomez',
    vehicleId: null,
    componentTypeId: 'seed-component-type-tobera',
    brand: 'Denso',
    reference: 'DLLA158P854',
    identifier: 'TOB-ANA-001',
    notes: 'Tobera sin vehiculo para probar vehicleId opcional y tipo requerido.',
  },
] as const;

const SEED_SUPPLIERS = [
  {
    id: 'seed-supplier-repuestos-central-main',
    name: 'Repuestos Central',
    type: SupplierType.COMPANY,
    contactName: 'Laura Perez',
    documentType: SupplierDocumentType.NIT,
    documentNumber: '900555111',
    email: 'compras@repuestos-central.test',
    notes: '<p>Proveedor principal de repuestos y soporte por WhatsApp.</p>',
    isActive: true,
    phones: [
      {
        id: 'seed-supplier-repuestos-central-main-phone-principal',
        label: 'Principal',
        phone: '3001112233',
        isPrimary: true,
        hasWhatsapp: true,
        notes: 'Canal comercial principal.',
      },
      {
        id: 'seed-supplier-repuestos-central-main-phone-bodega',
        label: 'Bodega',
        phone: '6015550101',
        isPrimary: false,
        hasWhatsapp: false,
        notes: 'Linea fija para despachos.',
      },
    ],
  },
  {
    id: 'seed-supplier-repuestos-central-duplicate',
    name: 'Repuestos Central',
    type: SupplierType.COMPANY,
    contactName: 'Miguel Torres',
    documentType: SupplierDocumentType.NIT,
    documentNumber: '901777222',
    email: 'aliados@repuestos-central.test',
    notes: '<p>Segundo proveedor con nombre repetido para validar v1 sin unicidad global.</p>',
    isActive: true,
    phones: [
      {
        id: 'seed-supplier-repuestos-central-duplicate-phone-principal',
        label: 'Aliado',
        phone: '3204445566',
        isPrimary: true,
        hasWhatsapp: true,
        notes: 'Contacto alterno para compras urgentes.',
      },
    ],
  },
  {
    id: 'seed-supplier-carlos-ramirez',
    name: 'Carlos Ramirez',
    type: SupplierType.PERSON,
    contactName: 'Carlos Ramirez',
    documentType: SupplierDocumentType.CEDULA,
    documentNumber: '79844556',
    email: 'carlos.ramirez@mecanismos.test',
    notes: '<p>Tornero externo para trabajos puntuales.</p>',
    isActive: true,
    phones: [
      {
        id: 'seed-supplier-carlos-ramirez-phone-movil',
        label: 'Móvil',
        phone: '3118889900',
        isPrimary: true,
        hasWhatsapp: true,
        notes: 'Responde mejor en horario laboral.',
      },
      {
        id: 'seed-supplier-carlos-ramirez-phone-taller',
        label: 'Taller',
        phone: '6015550202',
        isPrimary: false,
        hasWhatsapp: false,
        notes: 'Recepción fija del taller.',
      },
    ],
  },
] as const;

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to seed the database');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    }),
  });

  const now = new Date();

  try {
    for (const seedUser of SEED_USERS) {
      const email = seedUser.email.toLowerCase();
      const passwordHash = await hash(seedUser.password, BCRYPT_ROUNDS);

      const user = await prisma.user.upsert({
        where: { email },
        create: {
          id: randomUUID(),
          email,
          name: seedUser.name,
          role: seedUser.role,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          name: seedUser.name,
          role: seedUser.role,
          isActive: true,
          updatedAt: now,
        },
      });

      await prisma.account.upsert({
        where: { userId: user.id },
        create: {
          id: randomUUID(),
          userId: user.id,
          passwordHash,
          passwordUpdatedAt: now,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          passwordHash,
          passwordUpdatedAt: now,
          updatedAt: now,
        },
      });

      console.log(`Seeded ${seedUser.role} user: ${email}`);
    }

    for (const seedCustomer of SEED_CUSTOMERS) {
      await prisma.customer.upsert({
        where: {
          documentType_documentNumber: {
            documentType: seedCustomer.documentType,
            documentNumber: seedCustomer.documentNumber,
          },
        },
        create: {
          id: seedCustomer.id,
          name: seedCustomer.name,
          phone: seedCustomer.phone,
          documentType: seedCustomer.documentType,
          documentNumber: seedCustomer.documentNumber,
          email: seedCustomer.email,
          notes: seedCustomer.notes,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          name: seedCustomer.name,
          phone: seedCustomer.phone,
          email: seedCustomer.email,
          notes: seedCustomer.notes,
          updatedAt: now,
        },
      });

      console.log(`Seeded customer: ${seedCustomer.name}`);
    }

    for (const seedVehicle of SEED_VEHICLES) {
      await prisma.vehicle.upsert({
        where: { plate: seedVehicle.plate },
        create: {
          id: seedVehicle.id,
          customerId: seedVehicle.customerId,
          brand: seedVehicle.brand,
          modelReference: seedVehicle.modelReference,
          plate: seedVehicle.plate,
          notes: seedVehicle.notes,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          customerId: seedVehicle.customerId,
          brand: seedVehicle.brand,
          modelReference: seedVehicle.modelReference,
          notes: seedVehicle.notes,
          updatedAt: now,
        },
      });

      console.log(`Seeded vehicle: ${seedVehicle.plate}`);
    }

    for (const seedComponentType of SEED_COMPONENT_TYPES) {
      await prisma.componentType.upsert({
        where: { slug: seedComponentType.slug },
        create: {
          id: seedComponentType.id,
          name: seedComponentType.name,
          slug: seedComponentType.slug,
          description: seedComponentType.description,
          isActive: seedComponentType.isActive,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          name: seedComponentType.name,
          description: seedComponentType.description,
          isActive: seedComponentType.isActive,
          updatedAt: now,
        },
      });

      console.log(`Seeded component type: ${seedComponentType.slug}`);
    }

    for (const seedComponent of SEED_COMPONENTS) {
      await prisma.component.upsert({
        where: { id: seedComponent.id },
        create: {
          id: seedComponent.id,
          customerId: seedComponent.customerId,
          vehicleId: seedComponent.vehicleId,
          componentTypeId: seedComponent.componentTypeId,
          brand: seedComponent.brand,
          reference: seedComponent.reference,
          identifier: seedComponent.identifier,
          notes: seedComponent.notes,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          customerId: seedComponent.customerId,
          vehicleId: seedComponent.vehicleId,
          componentTypeId: seedComponent.componentTypeId,
          brand: seedComponent.brand,
          reference: seedComponent.reference,
          identifier: seedComponent.identifier,
          notes: seedComponent.notes,
          updatedAt: now,
        },
      });

      console.log(`Seeded component: ${seedComponent.identifier}`);
    }

    for (const seedSupplier of SEED_SUPPLIERS) {
      await prisma.supplier.upsert({
        where: { id: seedSupplier.id },
        create: {
          id: seedSupplier.id,
          name: seedSupplier.name,
          type: seedSupplier.type,
          contactName: seedSupplier.contactName,
          documentType: seedSupplier.documentType,
          documentNumber: seedSupplier.documentNumber,
          email: seedSupplier.email,
          notes: seedSupplier.notes,
          isActive: seedSupplier.isActive,
          createdAt: now,
          updatedAt: now,
          phones: {
            create: seedSupplier.phones.map((phone) => ({
              id: phone.id,
              label: phone.label,
              phone: phone.phone,
              isPrimary: phone.isPrimary,
              hasWhatsapp: phone.hasWhatsapp,
              notes: phone.notes,
              createdAt: now,
              updatedAt: now,
            })),
          },
        },
        update: {
          name: seedSupplier.name,
          type: seedSupplier.type,
          contactName: seedSupplier.contactName,
          documentType: seedSupplier.documentType,
          documentNumber: seedSupplier.documentNumber,
          email: seedSupplier.email,
          notes: seedSupplier.notes,
          isActive: seedSupplier.isActive,
          updatedAt: now,
          phones: {
            deleteMany: {},
            create: seedSupplier.phones.map((phone) => ({
              id: phone.id,
              label: phone.label,
              phone: phone.phone,
              isPrimary: phone.isPrimary,
              hasWhatsapp: phone.hasWhatsapp,
              notes: phone.notes,
              createdAt: now,
              updatedAt: now,
            })),
          },
        },
      });

      console.log(`Seeded supplier: ${seedSupplier.name} (${seedSupplier.id})`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
