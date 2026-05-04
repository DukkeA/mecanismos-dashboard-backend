-- CreateEnum
CREATE TYPE "CustomerDocumentType" AS ENUM ('CEDULA', 'NIT');

-- CreateEnum
CREATE TYPE "EmployeeType" AS ENUM ('MECHANIC', 'SALES', 'ADMIN');

-- CreateEnum
CREATE TYPE "WorkOrderType" AS ENUM ('SALE', 'WORKSHOP');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "EstimatePhase" AS ENUM ('INITIAL', 'FINAL');

-- CreateEnum
CREATE TYPE "EstimateLineType" AS ENUM ('PART', 'SERVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "InventoryItemType" AS ENUM ('REPLACEMENT_PART', 'OWNED_COMPONENT', 'OTHER');

-- CreateEnum
CREATE TYPE "InventoryCondition" AS ENUM ('NEW', 'USED', 'REMANUFACTURED');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "InventoryMovementReason" AS ENUM ('PURCHASE', 'WORK_ORDER_PURCHASE', 'WORK_ORDER_CONSUMPTION', 'MANUAL_ADJUSTMENT', 'RETURN', 'SALE');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('RENT', 'UTILITY', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkOrderCostCategory" AS ENUM ('OUTSOURCED_SERVICE', 'DIRECT_PURCHASE', 'MISC', 'OTHER');

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "documentType" "CustomerDocumentType" NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "modelReference" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Component" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "brand" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "identifier" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostCenter" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EmployeeType" NOT NULL,
    "phone" TEXT,
    "baseSalaryMonthly" INTEGER NOT NULL DEFAULT 0,
    "costCenterId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeBonus" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentMethod",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeBonus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCatalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "itemType" "InventoryItemType" NOT NULL,
    "condition" "InventoryCondition" NOT NULL DEFAULT 'NEW',
    "brand" TEXT,
    "reference" TEXT,
    "identifier" TEXT,
    "notes" TEXT,
    "minimumStock" INTEGER NOT NULL DEFAULT 0,
    "defaultSalePrice" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierQuoteHistory" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "workOrderId" TEXT,
    "quotedCost" INTEGER NOT NULL,
    "notes" TEXT,
    "quotedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierQuoteHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "type" "WorkOrderType" NOT NULL,
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "customerId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "componentId" TEXT,
    "assignedEmployeeId" TEXT,
    "summary" TEXT NOT NULL,
    "externalLink" TEXT,
    "notes" JSONB,
    "estimatedCompletionAt" TIMESTAMP(3),
    "estimatedCollectionAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopWorkOrderDetails" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "customerReportedIssue" TEXT,
    "diagnosisRequired" BOOLEAN NOT NULL DEFAULT false,
    "diagnosisSummary" TEXT,

    CONSTRAINT "WorkshopWorkOrderDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderEstimate" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "phase" "EstimatePhase" NOT NULL,
    "estimatedLaborHours" DECIMAL(6,2),
    "laborHourlyCostSnapshot" INTEGER,
    "baseCostAmount" INTEGER NOT NULL DEFAULT 0,
    "contingencyPct" INTEGER,
    "contingencyAmount" INTEGER NOT NULL DEFAULT 0,
    "totalCostAmount" INTEGER NOT NULL DEFAULT 0,
    "totalPriceAmount" INTEGER NOT NULL DEFAULT 0,
    "recommendedMinimumPrice" INTEGER,
    "recommendedPrice" INTEGER,
    "recommendedHighPrice" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderEstimateLine" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "lineType" "EstimateLineType" NOT NULL,
    "description" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "serviceCatalogId" TEXT,
    "supplierId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitCost" INTEGER,
    "unitPrice" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderEstimateLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderActualCost" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "category" "WorkOrderCostCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "supplierId" TEXT,
    "inventoryItemId" TEXT,
    "paymentMethod" "PaymentMethod",
    "incurredAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderActualCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderPayment" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paymentMethod" "PaymentMethod",
    "paidAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "movementType" "InventoryMovementType" NOT NULL,
    "reason" "InventoryMovementReason" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" INTEGER,
    "supplierId" TEXT,
    "workOrderId" TEXT,
    "isReservedForWorkOrder" BOOLEAN NOT NULL DEFAULT false,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amount" INTEGER NOT NULL,
    "costCenterId" TEXT,
    "expectedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paymentMethod" "PaymentMethod",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "companyName" TEXT NOT NULL DEFAULT 'Mecanismos Tecnicos',
    "currencyCode" TEXT NOT NULL DEFAULT 'COP',
    "monthlyWorkingHours" INTEGER NOT NULL DEFAULT 176,
    "saleContingencyPct" INTEGER NOT NULL DEFAULT 5,
    "workshopContingencyPct" INTEGER NOT NULL DEFAULT 10,
    "diagnosticContingencyPct" INTEGER NOT NULL DEFAULT 20,
    "minimumMarkupPct" INTEGER NOT NULL DEFAULT 20,
    "recommendedMarkupPct" INTEGER NOT NULL DEFAULT 35,
    "highMarkupPct" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_documentType_documentNumber_key" ON "Customer"("documentType", "documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plate_key" ON "Vehicle"("plate");

-- CreateIndex
CREATE INDEX "Vehicle_customerId_idx" ON "Vehicle"("customerId");

-- CreateIndex
CREATE INDEX "Component_customerId_idx" ON "Component"("customerId");

-- CreateIndex
CREATE INDEX "Component_vehicleId_idx" ON "Component"("vehicleId");

-- CreateIndex
CREATE INDEX "Component_identifier_idx" ON "Component"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "CostCenter_code_key" ON "CostCenter"("code");

-- CreateIndex
CREATE INDEX "Employee_costCenterId_idx" ON "Employee"("costCenterId");

-- CreateIndex
CREATE INDEX "Employee_type_idx" ON "Employee"("type");

-- CreateIndex
CREATE INDEX "EmployeeBonus_employeeId_idx" ON "EmployeeBonus"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeBonus_paidAt_idx" ON "EmployeeBonus"("paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_name_key" ON "Supplier"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCatalog_name_key" ON "ServiceCatalog"("name");

-- CreateIndex
CREATE INDEX "InventoryItem_reference_idx" ON "InventoryItem"("reference");

-- CreateIndex
CREATE INDEX "InventoryItem_identifier_idx" ON "InventoryItem"("identifier");

-- CreateIndex
CREATE INDEX "SupplierQuoteHistory_supplierId_quotedAt_idx" ON "SupplierQuoteHistory"("supplierId", "quotedAt");

-- CreateIndex
CREATE INDEX "SupplierQuoteHistory_inventoryItemId_quotedAt_idx" ON "SupplierQuoteHistory"("inventoryItemId", "quotedAt");

-- CreateIndex
CREATE INDEX "SupplierQuoteHistory_workOrderId_idx" ON "SupplierQuoteHistory"("workOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_number_key" ON "WorkOrder"("number");

-- CreateIndex
CREATE INDEX "WorkOrder_status_idx" ON "WorkOrder"("status");

-- CreateIndex
CREATE INDEX "WorkOrder_paymentStatus_idx" ON "WorkOrder"("paymentStatus");

-- CreateIndex
CREATE INDEX "WorkOrder_customerId_idx" ON "WorkOrder"("customerId");

-- CreateIndex
CREATE INDEX "WorkOrder_assignedEmployeeId_idx" ON "WorkOrder"("assignedEmployeeId");

-- CreateIndex
CREATE INDEX "WorkOrder_estimatedCollectionAt_idx" ON "WorkOrder"("estimatedCollectionAt");

-- CreateIndex
CREATE INDEX "WorkOrder_completedAt_idx" ON "WorkOrder"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopWorkOrderDetails_workOrderId_key" ON "WorkshopWorkOrderDetails"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderEstimate_phase_idx" ON "WorkOrderEstimate"("phase");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderEstimate_workOrderId_phase_key" ON "WorkOrderEstimate"("workOrderId", "phase");

-- CreateIndex
CREATE INDEX "WorkOrderEstimateLine_estimateId_idx" ON "WorkOrderEstimateLine"("estimateId");

-- CreateIndex
CREATE INDEX "WorkOrderEstimateLine_inventoryItemId_idx" ON "WorkOrderEstimateLine"("inventoryItemId");

-- CreateIndex
CREATE INDEX "WorkOrderEstimateLine_serviceCatalogId_idx" ON "WorkOrderEstimateLine"("serviceCatalogId");

-- CreateIndex
CREATE INDEX "WorkOrderEstimateLine_supplierId_idx" ON "WorkOrderEstimateLine"("supplierId");

-- CreateIndex
CREATE INDEX "WorkOrderActualCost_workOrderId_idx" ON "WorkOrderActualCost"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderActualCost_supplierId_idx" ON "WorkOrderActualCost"("supplierId");

-- CreateIndex
CREATE INDEX "WorkOrderActualCost_inventoryItemId_idx" ON "WorkOrderActualCost"("inventoryItemId");

-- CreateIndex
CREATE INDEX "WorkOrderActualCost_incurredAt_idx" ON "WorkOrderActualCost"("incurredAt");

-- CreateIndex
CREATE INDEX "WorkOrderPayment_workOrderId_idx" ON "WorkOrderPayment"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderPayment_paidAt_idx" ON "WorkOrderPayment"("paidAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_inventoryItemId_occurredAt_idx" ON "InventoryMovement"("inventoryItemId", "occurredAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_supplierId_idx" ON "InventoryMovement"("supplierId");

-- CreateIndex
CREATE INDEX "InventoryMovement_workOrderId_occurredAt_idx" ON "InventoryMovement"("workOrderId", "occurredAt");

-- CreateIndex
CREATE INDEX "Expense_costCenterId_idx" ON "Expense"("costCenterId");

-- CreateIndex
CREATE INDEX "Expense_expectedAt_idx" ON "Expense"("expectedAt");

-- CreateIndex
CREATE INDEX "Expense_paidAt_idx" ON "Expense"("paidAt");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBonus" ADD CONSTRAINT "EmployeeBonus_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierQuoteHistory" ADD CONSTRAINT "SupplierQuoteHistory_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierQuoteHistory" ADD CONSTRAINT "SupplierQuoteHistory_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierQuoteHistory" ADD CONSTRAINT "SupplierQuoteHistory_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopWorkOrderDetails" ADD CONSTRAINT "WorkshopWorkOrderDetails_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderEstimate" ADD CONSTRAINT "WorkOrderEstimate_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderEstimateLine" ADD CONSTRAINT "WorkOrderEstimateLine_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "WorkOrderEstimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderEstimateLine" ADD CONSTRAINT "WorkOrderEstimateLine_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderEstimateLine" ADD CONSTRAINT "WorkOrderEstimateLine_serviceCatalogId_fkey" FOREIGN KEY ("serviceCatalogId") REFERENCES "ServiceCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderEstimateLine" ADD CONSTRAINT "WorkOrderEstimateLine_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderActualCost" ADD CONSTRAINT "WorkOrderActualCost_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderActualCost" ADD CONSTRAINT "WorkOrderActualCost_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderActualCost" ADD CONSTRAINT "WorkOrderActualCost_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderPayment" ADD CONSTRAINT "WorkOrderPayment_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
