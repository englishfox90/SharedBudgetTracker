-- AlterTable
ALTER TABLE "income_rules" ADD COLUMN     "filingStatus" TEXT NOT NULL DEFAULT 'single',
ADD COLUMN     "stateTaxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "additionalWithholding" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "netPayOverride" DOUBLE PRECISION,
ADD COLUMN     "maxContributionPct" DOUBLE PRECISION NOT NULL DEFAULT 0.8;

-- CreateTable
CREATE TABLE "paycheck_deductions" (
    "id" SERIAL NOT NULL,
    "incomeRuleId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "treatment" TEXT NOT NULL,
    "isSharedBenefit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paycheck_deductions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "paycheck_deductions_incomeRuleId_idx" ON "paycheck_deductions"("incomeRuleId");

-- AddForeignKey
ALTER TABLE "paycheck_deductions" ADD CONSTRAINT "paycheck_deductions_incomeRuleId_fkey" FOREIGN KEY ("incomeRuleId") REFERENCES "income_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
