-- CreateTable
CREATE TABLE "pmcs"."funds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "opening_balance" DECIMAL(19,4) NOT NULL,
    "current_balance" DECIMAL(19,4) NOT NULL,
    "allow_overdraft" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "funds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."transaction_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "transaction_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."financial_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "transaction_number" VARCHAR(80) NOT NULL,
    "transaction_date" DATE NOT NULL,
    "transaction_type" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
    "reference" VARCHAR(256),
    "description" TEXT,
    "project_id" UUID,
    "category_id" UUID,
    "created_by_id" UUID NOT NULL,
    "approved_by_id" UUID,
    "completed_at" TIMESTAMPTZ(6),
    "reversal_of_transaction_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."ledger_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "fund_id" UUID,
    "currency" CHAR(3) NOT NULL,
    "entry_role" VARCHAR(16) NOT NULL DEFAULT 'FUND',
    "direction" VARCHAR(16) NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "balance_before" DECIMAL(19,4),
    "balance_after" DECIMAL(19,4),
    "counterparty_code" VARCHAR(128),
    "category_id" UUID,
    "project_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."fund_transfers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "source_fund_id" UUID NOT NULL,
    "destination_fund_id" UUID NOT NULL,
    "source_currency" CHAR(3) NOT NULL,
    "destination_currency" CHAR(3) NOT NULL,
    "source_amount" DECIMAL(19,4) NOT NULL,
    "destination_amount" DECIMAL(19,4) NOT NULL,
    "exchange_rate" DECIMAL(18,8),
    "fee" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fund_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."currency_conversions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "source_fund_id" UUID NOT NULL,
    "destination_fund_id" UUID NOT NULL,
    "conversion_date" DATE NOT NULL,
    "source_currency" CHAR(3) NOT NULL,
    "destination_currency" CHAR(3) NOT NULL,
    "source_amount" DECIMAL(19,4) NOT NULL,
    "exchange_rate" DECIMAL(18,8) NOT NULL,
    "destination_amount" DECIMAL(19,4) NOT NULL,
    "conversion_fee" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "total_source_cost" DECIMAL(19,4) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "currency_conversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."budgets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "category_id" UUID,
    "fund_id" UUID,
    "project_id" UUID,
    "currency" CHAR(3) NOT NULL,
    "budget_amount" DECIMAL(19,4) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."budget_alert_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "threshold_percent" DECIMAL(5,2) NOT NULL,
    "severity" VARCHAR(32) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "budget_alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "funds_org_currency_status_idx" ON "pmcs"."funds"("organization_id", "currency", "status");

-- CreateIndex
CREATE UNIQUE INDEX "funds_org_id_id_key" ON "pmcs"."funds"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "funds_org_code_key" ON "pmcs"."funds"("organization_id", "code");

-- CreateIndex
CREATE INDEX "transaction_categories_org_status_idx" ON "pmcs"."transaction_categories"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_categories_org_id_id_key" ON "pmcs"."transaction_categories"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_categories_org_code_key" ON "pmcs"."transaction_categories"("organization_id", "code");

-- CreateIndex
CREATE INDEX "financial_transactions_org_date_status_idx" ON "pmcs"."financial_transactions"("organization_id", "transaction_date", "status");

-- CreateIndex
CREATE INDEX "financial_transactions_org_type_status_idx" ON "pmcs"."financial_transactions"("organization_id", "transaction_type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "financial_transactions_org_id_id_key" ON "pmcs"."financial_transactions"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "financial_transactions_org_number_key" ON "pmcs"."financial_transactions"("organization_id", "transaction_number");

-- CreateIndex
CREATE INDEX "ledger_entries_org_fund_created_idx" ON "pmcs"."ledger_entries"("organization_id", "fund_id", "created_at");

-- CreateIndex
CREATE INDEX "ledger_entries_org_transaction_idx" ON "pmcs"."ledger_entries"("organization_id", "transaction_id");

-- CreateIndex
CREATE INDEX "ledger_entries_org_currency_direction_idx" ON "pmcs"."ledger_entries"("organization_id", "currency", "direction", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_org_id_id_key" ON "pmcs"."ledger_entries"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "fund_transfers_transaction_id_key" ON "pmcs"."fund_transfers"("transaction_id");

-- CreateIndex
CREATE INDEX "fund_transfers_org_source_created_idx" ON "pmcs"."fund_transfers"("organization_id", "source_fund_id", "created_at");

-- CreateIndex
CREATE INDEX "fund_transfers_org_destination_created_idx" ON "pmcs"."fund_transfers"("organization_id", "destination_fund_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "fund_transfers_org_id_id_key" ON "pmcs"."fund_transfers"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "fund_transfers_org_transaction_key" ON "pmcs"."fund_transfers"("organization_id", "transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "currency_conversions_transaction_id_key" ON "pmcs"."currency_conversions"("transaction_id");

-- CreateIndex
CREATE INDEX "currency_conversions_org_date_currency_idx" ON "pmcs"."currency_conversions"("organization_id", "conversion_date", "source_currency", "destination_currency");

-- CreateIndex
CREATE UNIQUE INDEX "currency_conversions_org_id_id_key" ON "pmcs"."currency_conversions"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "currency_conversions_org_transaction_key" ON "pmcs"."currency_conversions"("organization_id", "transaction_id");

-- CreateIndex
CREATE INDEX "budgets_org_currency_status_dates_idx" ON "pmcs"."budgets"("organization_id", "currency", "status", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "budgets_org_project_status_idx" ON "pmcs"."budgets"("organization_id", "project_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_org_id_id_key" ON "pmcs"."budgets"("organization_id", "id");

-- CreateIndex
CREATE INDEX "budget_alert_rules_org_enabled_threshold_idx" ON "pmcs"."budget_alert_rules"("organization_id", "enabled", "threshold_percent");

-- CreateIndex
CREATE UNIQUE INDEX "budget_alert_rules_org_threshold_key" ON "pmcs"."budget_alert_rules"("organization_id", "threshold_percent");

-- AddForeignKey
ALTER TABLE "pmcs"."funds" ADD CONSTRAINT "funds_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "pmcs"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."funds" ADD CONSTRAINT "funds_organization_id_created_by_id_fkey" FOREIGN KEY ("organization_id", "created_by_id") REFERENCES "pmcs"."organization_memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."transaction_categories" ADD CONSTRAINT "transaction_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "pmcs"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."transaction_categories" ADD CONSTRAINT "transaction_categories_organization_id_created_by_id_fkey" FOREIGN KEY ("organization_id", "created_by_id") REFERENCES "pmcs"."organization_memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."financial_transactions" ADD CONSTRAINT "financial_transactions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "pmcs"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."financial_transactions" ADD CONSTRAINT "financial_transactions_organization_id_project_id_fkey" FOREIGN KEY ("organization_id", "project_id") REFERENCES "pmcs"."projects"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."financial_transactions" ADD CONSTRAINT "financial_transactions_organization_id_category_id_fkey" FOREIGN KEY ("organization_id", "category_id") REFERENCES "pmcs"."transaction_categories"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."financial_transactions" ADD CONSTRAINT "financial_transactions_organization_id_created_by_id_fkey" FOREIGN KEY ("organization_id", "created_by_id") REFERENCES "pmcs"."organization_memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."financial_transactions" ADD CONSTRAINT "financial_transactions_organization_id_approved_by_id_fkey" FOREIGN KEY ("organization_id", "approved_by_id") REFERENCES "pmcs"."organization_memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."financial_transactions" ADD CONSTRAINT "financial_transactions_organization_id_reversal_of_transac_fkey" FOREIGN KEY ("organization_id", "reversal_of_transaction_id") REFERENCES "pmcs"."financial_transactions"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."ledger_entries" ADD CONSTRAINT "ledger_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "pmcs"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."ledger_entries" ADD CONSTRAINT "ledger_entries_organization_id_transaction_id_fkey" FOREIGN KEY ("organization_id", "transaction_id") REFERENCES "pmcs"."financial_transactions"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."ledger_entries" ADD CONSTRAINT "ledger_entries_organization_id_fund_id_fkey" FOREIGN KEY ("organization_id", "fund_id") REFERENCES "pmcs"."funds"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."ledger_entries" ADD CONSTRAINT "ledger_entries_organization_id_category_id_fkey" FOREIGN KEY ("organization_id", "category_id") REFERENCES "pmcs"."transaction_categories"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."ledger_entries" ADD CONSTRAINT "ledger_entries_organization_id_project_id_fkey" FOREIGN KEY ("organization_id", "project_id") REFERENCES "pmcs"."projects"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."fund_transfers" ADD CONSTRAINT "fund_transfers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "pmcs"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."fund_transfers" ADD CONSTRAINT "fund_transfers_organization_id_transaction_id_fkey" FOREIGN KEY ("organization_id", "transaction_id") REFERENCES "pmcs"."financial_transactions"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."fund_transfers" ADD CONSTRAINT "fund_transfers_organization_id_created_by_id_fkey" FOREIGN KEY ("organization_id", "created_by_id") REFERENCES "pmcs"."organization_memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."fund_transfers" ADD CONSTRAINT "fund_transfers_organization_id_source_fund_id_fkey" FOREIGN KEY ("organization_id", "source_fund_id") REFERENCES "pmcs"."funds"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."fund_transfers" ADD CONSTRAINT "fund_transfers_organization_id_destination_fund_id_fkey" FOREIGN KEY ("organization_id", "destination_fund_id") REFERENCES "pmcs"."funds"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."currency_conversions" ADD CONSTRAINT "currency_conversions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "pmcs"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."currency_conversions" ADD CONSTRAINT "currency_conversions_organization_id_transaction_id_fkey" FOREIGN KEY ("organization_id", "transaction_id") REFERENCES "pmcs"."financial_transactions"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."currency_conversions" ADD CONSTRAINT "currency_conversions_organization_id_created_by_id_fkey" FOREIGN KEY ("organization_id", "created_by_id") REFERENCES "pmcs"."organization_memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."currency_conversions" ADD CONSTRAINT "currency_conversions_organization_id_source_fund_id_fkey" FOREIGN KEY ("organization_id", "source_fund_id") REFERENCES "pmcs"."funds"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."currency_conversions" ADD CONSTRAINT "currency_conversions_organization_id_destination_fund_id_fkey" FOREIGN KEY ("organization_id", "destination_fund_id") REFERENCES "pmcs"."funds"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."budgets" ADD CONSTRAINT "budgets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "pmcs"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."budgets" ADD CONSTRAINT "budgets_organization_id_created_by_id_fkey" FOREIGN KEY ("organization_id", "created_by_id") REFERENCES "pmcs"."organization_memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."budgets" ADD CONSTRAINT "budgets_organization_id_category_id_fkey" FOREIGN KEY ("organization_id", "category_id") REFERENCES "pmcs"."transaction_categories"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."budgets" ADD CONSTRAINT "budgets_organization_id_fund_id_fkey" FOREIGN KEY ("organization_id", "fund_id") REFERENCES "pmcs"."funds"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."budgets" ADD CONSTRAINT "budgets_organization_id_project_id_fkey" FOREIGN KEY ("organization_id", "project_id") REFERENCES "pmcs"."projects"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."budget_alert_rules" ADD CONSTRAINT "budget_alert_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "pmcs"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

