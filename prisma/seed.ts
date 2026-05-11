import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { hash } from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  CustomerDocumentType,
  InventoryCondition,
  InventoryItemType,
  InventoryMovementReason,
  InventoryMovementType,
  PrismaClient,
  SupplierDocumentType,
  SupplierQuoteStatus,
  SupplierType,
} from '../generated/prisma/client';
import { seedEmployeesAndBonuses } from './seed-employees';
import { seedExpenses } from './seed-expenses';
import { seedDefaultCostCenters } from './seed-cost-centers';
import { seedPricingLaborSettings } from './seed-app-settings';
import { seedWorkOrders } from './seed-work-orders';

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
    notes:
      'Tobera sin vehiculo para probar vehicleId opcional y tipo requerido.',
  },
] as const;

const SEED_SERVICES = [
  {
    id: 'seed-service-diagnostico',
    name: 'Diagnóstico',
    slug: 'diagnostico',
    description:
      'Diagnóstico inicial para lectura de fallas y definición de alcance.',
    isActive: true,
  },
  {
    id: 'seed-service-reparacion',
    name: 'Reparación',
    slug: 'reparacion',
    description:
      'Servicio base de reparación correctiva sobre componentes y sistemas.',
    isActive: true,
  },
  {
    id: 'seed-service-calibracion',
    name: 'Calibración',
    slug: 'calibracion',
    description:
      'Calibración de banco para componentes de inyección y precisión.',
    isActive: true,
  },
  {
    id: 'seed-service-instalacion',
    name: 'Instalación',
    slug: 'instalacion',
    description:
      'Instalación controlada con verificación final de funcionamiento.',
    isActive: true,
  },
] as const;

type SeedSupplierPhone = {
  id: string;
  label: string;
  phone: string;
  isPrimary: boolean;
  hasWhatsapp: boolean;
  notes: string;
};

type SeedSupplier = {
  id: string;
  name: string;
  type: SupplierType;
  contactName: string;
  documentType: SupplierDocumentType;
  documentNumber: string;
  email: string;
  notes: string;
  isActive: boolean;
  phones: readonly SeedSupplierPhone[];
};

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
    notes:
      '<p>Segundo proveedor con nombre repetido para validar v1 sin unicidad global.</p>',
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
] as const satisfies readonly SeedSupplier[];

const SEED_INVENTORY_ITEMS = [
  {
    id: 'seed-inventory-item-bosch-inyector',
    name: 'Inyector Bosch 0445120231',
    itemType: InventoryItemType.STOCK_OWNED,
    condition: InventoryCondition.NEW,
    brand: 'Bosch',
    reference: '0445120231',
    identifier: 'INV-BOSCH-001',
    notes: 'Stock físico base para movimientos y cotizaciones.',
    minimumStock: 1,
    defaultSalePrice: 250000,
    isActive: true,
  },
  {
    id: 'seed-inventory-item-cotizable-tobera',
    name: 'Tobera Denso cotizable',
    itemType: InventoryItemType.DEMAND_PURCHASED,
    condition: InventoryCondition.NEW,
    brand: 'Denso',
    reference: 'DLLA158P854',
    identifier: 'INV-DENSO-QUOTE-001',
    notes: 'Ítem bajo demanda para lookup de cotizaciones con stock cero.',
    minimumStock: 0,
    defaultSalePrice: 90000,
    isActive: true,
  },
] as const;

const SEED_INVENTORY_MOVEMENTS = [
  {
    id: 'seed-inventory-movement-bosch-in-1',
    inventoryItemId: 'seed-inventory-item-bosch-inyector',
    movementType: InventoryMovementType.IN,
    reason: InventoryMovementReason.PURCHASE,
    quantity: 5,
    unitCost: 180000,
    supplierId: 'seed-supplier-repuestos-central-main',
    occurredAt: new Date('2026-05-05T10:00:00.000Z'),
    notes: 'Compra inicial de muestra.',
  },
  {
    id: 'seed-inventory-movement-bosch-out-1',
    inventoryItemId: 'seed-inventory-item-bosch-inyector',
    movementType: InventoryMovementType.OUT,
    reason: InventoryMovementReason.SALE,
    quantity: 2,
    unitCost: 180000,
    supplierId: null,
    occurredAt: new Date('2026-05-06T09:30:00.000Z'),
    notes: 'Salida comercial de ejemplo.',
  },
] as const;

const SEED_SUPPLIER_QUOTES = [
  {
    id: 'seed-supplier-quote-bosch-central-v1',
    supplierId: 'seed-supplier-repuestos-central-main',
    inventoryItemId: 'seed-inventory-item-bosch-inyector',
    quotedCost: 178000,
    quotedAt: new Date('2026-05-02T08:00:00.000Z'),
    status: SupplierQuoteStatus.ACTIVE,
    notes: 'Primer valor válido para comparativo.',
    correctionReason: null,
    voidReason: null,
    voidedAt: null,
  },
  {
    id: 'seed-supplier-quote-bosch-central-v2',
    supplierId: 'seed-supplier-repuestos-central-main',
    inventoryItemId: 'seed-inventory-item-bosch-inyector',
    quotedCost: 182000,
    quotedAt: new Date('2026-05-04T08:00:00.000Z'),
    status: SupplierQuoteStatus.ACTIVE,
    notes: 'Nuevo precio vigente.',
    correctionReason: null,
    voidReason: null,
    voidedAt: null,
  },
  {
    id: 'seed-supplier-quote-tobera-aliado-voided',
    supplierId: 'seed-supplier-repuestos-central-duplicate',
    inventoryItemId: 'seed-inventory-item-cotizable-tobera',
    quotedCost: 76000,
    quotedAt: new Date('2026-05-03T15:00:00.000Z'),
    status: SupplierQuoteStatus.VOIDED,
    notes: 'Cotización anulada por referencia incorrecta.',
    correctionReason: 'Se corrigió la referencia después del contacto inicial.',
    voidReason: 'Referencia equivocada',
    voidedAt: new Date('2026-05-03T18:00:00.000Z'),
  },
] as const;

function mapSeedSupplierPhones(
  phones: readonly SeedSupplierPhone[],
  now: Date,
) {
  return phones.map((phone) => ({
    id: phone.id,
    label: phone.label,
    phone: phone.phone,
    isPrimary: phone.isPrimary,
    hasWhatsapp: phone.hasWhatsapp,
    notes: phone.notes,
    createdAt: now,
    updatedAt: now,
  }));
}

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

    for (const seedService of SEED_SERVICES) {
      await prisma.serviceCatalog.upsert({
        where: { slug: seedService.slug },
        create: {
          id: seedService.id,
          name: seedService.name,
          slug: seedService.slug,
          description: seedService.description,
          isActive: seedService.isActive,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          name: seedService.name,
          description: seedService.description,
          isActive: seedService.isActive,
          updatedAt: now,
        },
      });

      console.log(`Seeded service: ${seedService.slug}`);
    }

    await seedDefaultCostCenters(prisma, now);

    console.log('Seeded default cost centers: GENERAL, BODEGA, OFICINA');

    await seedExpenses(prisma, now);

    console.log('Seeded operational expenses');

    await seedEmployeesAndBonuses(prisma, now);

    console.log('Seeded employees and manual bonuses');

    await seedPricingLaborSettings(prisma, now);

    console.log('Seeded pricing/labor app settings singleton');

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
            create: mapSeedSupplierPhones(seedSupplier.phones, now),
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
            create: mapSeedSupplierPhones(seedSupplier.phones, now),
          },
        },
      });

      console.log(`Seeded supplier: ${seedSupplier.name} (${seedSupplier.id})`);
    }

    for (const seedInventoryItem of SEED_INVENTORY_ITEMS) {
      await prisma.inventoryItem.upsert({
        where: { id: seedInventoryItem.id },
        create: {
          ...seedInventoryItem,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          ...seedInventoryItem,
          updatedAt: now,
        },
      });

      console.log(`Seeded inventory item: ${seedInventoryItem.id}`);
    }

    for (const seedInventoryMovement of SEED_INVENTORY_MOVEMENTS) {
      await prisma.inventoryMovement.upsert({
        where: { id: seedInventoryMovement.id },
        create: {
          ...seedInventoryMovement,
          createdAt: now,
        },
        update: seedInventoryMovement,
      });

      console.log(`Seeded inventory movement: ${seedInventoryMovement.id}`);
    }

    for (const seedSupplierQuote of SEED_SUPPLIER_QUOTES) {
      await prisma.supplierQuoteHistory.upsert({
        where: { id: seedSupplierQuote.id },
        create: {
          ...seedSupplierQuote,
          createdAt: now,
          updatedAt: now,
        },
        update: {
          supplierId: seedSupplierQuote.supplierId,
          inventoryItemId: seedSupplierQuote.inventoryItemId,
          quotedCost: seedSupplierQuote.quotedCost,
          quotedAt: seedSupplierQuote.quotedAt,
          status: seedSupplierQuote.status,
          notes: seedSupplierQuote.notes,
          correctionReason: seedSupplierQuote.correctionReason,
          voidReason: seedSupplierQuote.voidReason,
          voidedAt: seedSupplierQuote.voidedAt,
          updatedAt: now,
        },
      });

      console.log(`Seeded supplier quote: ${seedSupplierQuote.id}`);
    }

    await seedWorkOrders(prisma, now);

    console.log(
      'Seeded work orders: seed-work-order-sale-counter-quote, seed-work-order-workshop-injector-repair',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
