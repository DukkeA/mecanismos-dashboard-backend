-- CreateEnum
CREATE TYPE "EmployeeMonthlyPayrollStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- CreateTable
CREATE TABLE "EmployeeMonthlyPayroll" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "EmployeeMonthlyPayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "salaryTotal" INTEGER NOT NULL DEFAULT 0,
    "bonusTotal" INTEGER NOT NULL DEFAULT 0,
    "grandTotal" INTEGER NOT NULL DEFAULT 0,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeMonthlyPayroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeMonthlyPayrollLine" (
    "id" TEXT NOT NULL,
    "payrollId" TEXT NOT NULL,
    "employeeId" TEXT,
    "employeeName" TEXT NOT NULL,
    "employeeType" "EmployeeType" NOT NULL,
    "costCenterId" TEXT,
    "costCenterCode" TEXT,
    "costCenterName" TEXT,
    "baseSalaryMonthlySnapshot" INTEGER NOT NULL,
    "bonusTotal" INTEGER NOT NULL DEFAULT 0,
    "bonusCount" INTEGER NOT NULL DEFAULT 0,
    "totalPay" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeMonthlyPayrollLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeMonthlyPayroll_year_month_key" ON "EmployeeMonthlyPayroll"("year", "month");

-- CreateIndex
CREATE INDEX "EmployeeMonthlyPayroll_status_year_month_idx" ON "EmployeeMonthlyPayroll"("status", "year", "month");

-- CreateIndex
CREATE INDEX "EmployeeMonthlyPayroll_generatedAt_idx" ON "EmployeeMonthlyPayroll"("generatedAt");

-- CreateIndex
CREATE INDEX "EmployeeMonthlyPayrollLine_payrollId_idx" ON "EmployeeMonthlyPayrollLine"("payrollId");

-- CreateIndex
CREATE INDEX "EmployeeMonthlyPayrollLine_employeeId_idx" ON "EmployeeMonthlyPayrollLine"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeMonthlyPayrollLine_costCenterId_idx" ON "EmployeeMonthlyPayrollLine"("costCenterId");

-- AddForeignKey
ALTER TABLE "EmployeeMonthlyPayrollLine" ADD CONSTRAINT "EmployeeMonthlyPayrollLine_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "EmployeeMonthlyPayroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeMonthlyPayrollLine" ADD CONSTRAINT "EmployeeMonthlyPayrollLine_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeMonthlyPayrollLine" ADD CONSTRAINT "EmployeeMonthlyPayrollLine_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
