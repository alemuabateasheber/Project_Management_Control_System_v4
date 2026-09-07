-- Install the UUID generator before tables use gen_random_uuid().
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "pmcs";

-- CreateTable
CREATE TABLE "pmcs"."users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "display_name" VARCHAR(200) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."user_identities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(64) NOT NULL,
    "issuer" VARCHAR(512) NOT NULL DEFAULT '',
    "subject" VARCHAR(512) NOT NULL,
    "login_identifier" VARCHAR(320),
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."password_credentials" (
    "user_id" UUID NOT NULL,
    "password_hash" VARCHAR(1024) NOT NULL,
    "algorithm" VARCHAR(64) NOT NULL DEFAULT 'argon2id',
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "must_rotate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "password_credentials_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "pmcs"."auth_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "refresh_token_hash" VARCHAR(512) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "replaced_by_id" UUID,
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(1024),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6),

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."mfa_factors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "factor_type" VARCHAR(32) NOT NULL,
    "label" VARCHAR(128),
    "secret_cipher" VARCHAR(4096),
    "credential_id" VARCHAR(1024),
    "public_key" VARCHAR(8192),
    "verified_at" TIMESTAMPTZ(6),
    "disabled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(100) NOT NULL,
    "legal_name" VARCHAR(300) NOT NULL,
    "display_name" VARCHAR(300) NOT NULL,
    "default_currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "settings" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."departments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."locations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "time_zone" VARCHAR(100),
    "country_code" CHAR(2),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."teams" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "department_id" UUID,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."organization_memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "department_id" UUID,
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(160) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."role_permissions" (
    "organization_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("organization_id","role_id","permission_id")
);

-- CreateTable
CREATE TABLE "pmcs"."membership_roles" (
    "organization_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_roles_pkey" PRIMARY KEY ("organization_id","membership_id","role_id")
);

-- CreateTable
CREATE TABLE "pmcs"."team_memberships" (
    "organization_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ(6),

    CONSTRAINT "team_memberships_pkey" PRIMARY KEY ("organization_id","team_id","membership_id")
);

-- CreateTable
CREATE TABLE "pmcs"."portfolios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "parent_portfolio_id" UUID,
    "owner_membership_id" UUID,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "portfolio_id" UUID,
    "sponsor_membership_id" UUID,
    "manager_membership_id" UUID,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "objectives" TEXT,
    "scope" TEXT,
    "lifecycle_status" VARCHAR(32) NOT NULL DEFAULT 'proposed',
    "priority" VARCHAR(32) NOT NULL DEFAULT 'medium',
    "health" VARCHAR(32) NOT NULL DEFAULT 'green',
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "planned_start_date" DATE,
    "planned_finish_date" DATE,
    "actual_start_date" DATE,
    "actual_finish_date" DATE,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."project_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "membership_role" VARCHAR(64) NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."project_phases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(32) NOT NULL DEFAULT 'planned',
    "planned_start_date" DATE,
    "planned_finish_date" DATE,
    "actual_start_date" DATE,
    "actual_finish_date" DATE,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "project_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."project_health_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "calculated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rule_set_version" INTEGER NOT NULL,
    "schedule_health" VARCHAR(16) NOT NULL,
    "budget_health" VARCHAR(16) NOT NULL,
    "scope_health" VARCHAR(16) NOT NULL,
    "resource_health" VARCHAR(16) NOT NULL,
    "risk_health" VARCHAR(16) NOT NULL,
    "overall_health" VARCHAR(16) NOT NULL,
    "score" DECIMAL(5,2),
    "metrics" JSONB NOT NULL,
    "source_watermark" VARCHAR(256),

    CONSTRAINT "project_health_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."resources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "membership_id" UUID,
    "department_id" UUID,
    "team_id" UUID,
    "resource_type" VARCHAR(32) NOT NULL,
    "display_name" VARCHAR(300) NOT NULL,
    "active_from" DATE,
    "active_to" DATE,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."wbs_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "phase_id" UUID,
    "parent_wbs_item_id" UUID,
    "owner_membership_id" UUID,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "item_type" VARCHAR(32) NOT NULL DEFAULT 'work_package',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(32) NOT NULL DEFAULT 'planned',
    "planned_start_date" DATE,
    "planned_finish_date" DATE,
    "forecast_start_date" DATE,
    "forecast_finish_date" DATE,
    "actual_start_date" DATE,
    "actual_finish_date" DATE,
    "percent_complete" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "wbs_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "wbs_item_id" UUID,
    "parent_task_id" UUID,
    "owner_membership_id" UUID,
    "code" VARCHAR(64) NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(32) NOT NULL DEFAULT 'backlog',
    "priority" VARCHAR(32) NOT NULL DEFAULT 'medium',
    "planned_start_date" DATE,
    "planned_finish_date" DATE,
    "forecast_start_date" DATE,
    "forecast_finish_date" DATE,
    "actual_start_date" DATE,
    "completed_at" TIMESTAMPTZ(6),
    "estimated_hours" DECIMAL(12,2),
    "actual_hours" DECIMAL(12,2),
    "percent_complete" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."task_dependencies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "predecessor_id" UUID NOT NULL,
    "successor_id" UUID NOT NULL,
    "dependency_type" VARCHAR(32) NOT NULL DEFAULT 'finish_to_start',
    "lag_days" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."task_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "resource_id" UUID NOT NULL,
    "assignment_role" VARCHAR(32) NOT NULL DEFAULT 'assignee',
    "planned_hours" DECIMAL(12,2),
    "actual_hours" DECIMAL(12,2),
    "start_date" DATE,
    "end_date" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "task_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."task_progress_updates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "reporter_membership_id" UUID NOT NULL,
    "reporting_date" DATE NOT NULL,
    "percent_complete" DECIMAL(5,2) NOT NULL,
    "actual_hours" DECIMAL(12,2),
    "narrative" TEXT,
    "blocker" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_progress_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."milestones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "phase_id" UUID,
    "owner_membership_id" UUID,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "planned_date" DATE,
    "forecast_date" DATE,
    "actual_date" DATE,
    "status" VARCHAR(32) NOT NULL DEFAULT 'planned',
    "is_critical" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."baselines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "baseline_number" INTEGER NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
    "includes_schedule" BOOLEAN NOT NULL DEFAULT true,
    "includes_budget" BOOLEAN NOT NULL DEFAULT false,
    "includes_scope" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID NOT NULL,
    "frozen_by_id" UUID,
    "approved_by_id" UUID,
    "frozen_at" TIMESTAMPTZ(6),
    "approved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "baselines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."baseline_wbs_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "baseline_id" UUID NOT NULL,
    "source_wbs_item_id" UUID,
    "code" VARCHAR(64) NOT NULL,
    "parent_code" VARCHAR(64),
    "name" VARCHAR(300) NOT NULL,
    "planned_start_date" DATE,
    "planned_finish_date" DATE,
    "planned_effort" DECIMAL(14,2),
    "planned_cost" DECIMAL(19,4),
    "currency" CHAR(3),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "baseline_wbs_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."baseline_tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "baseline_id" UUID NOT NULL,
    "source_task_id" UUID,
    "code" VARCHAR(64) NOT NULL,
    "wbs_code" VARCHAR(64),
    "parent_task_code" VARCHAR(64),
    "title" VARCHAR(300) NOT NULL,
    "planned_start_date" DATE,
    "planned_finish_date" DATE,
    "planned_effort" DECIMAL(14,2),
    "planned_cost" DECIMAL(19,4),
    "currency" CHAR(3),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "baseline_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."baseline_milestones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "baseline_id" UUID NOT NULL,
    "source_milestone_id" UUID,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "planned_date" DATE,
    "is_critical" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "baseline_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."budget_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "kind" VARCHAR(32) NOT NULL DEFAULT 'working',
    "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
    "currency" CHAR(3) NOT NULL,
    "effective_date" DATE,
    "approved_at" TIMESTAMPTZ(6),
    "locked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."budget_line_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "budget_version_id" UUID NOT NULL,
    "wbs_item_id" UUID,
    "description" VARCHAR(500) NOT NULL,
    "period_start" DATE,
    "period_end" DATE,
    "quantity" DECIMAL(18,4),
    "unit" VARCHAR(32),
    "unit_rate" DECIMAL(19,4),
    "planned_amount" DECIMAL(19,4) NOT NULL,
    "approved_amount" DECIMAL(19,4),
    "contingency_amount" DECIMAL(19,4),
    "currency" CHAR(3) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."cost_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "transaction_type" VARCHAR(32) NOT NULL,
    "external_reference" VARCHAR(256),
    "transaction_date" DATE NOT NULL,
    "posting_status" VARCHAR(32) NOT NULL DEFAULT 'draft',
    "total_amount" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "reversal_of_id" UUID,
    "posted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."cost_transaction_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "description" VARCHAR(500),
    "quantity" DECIMAL(18,4),
    "unit_cost" DECIMAL(19,4),
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,

    CONSTRAINT "cost_transaction_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."commitments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "reference" VARCHAR(256) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'open',
    "committed_amount" DECIMAL(19,4) NOT NULL,
    "released_amount" DECIMAL(19,4),
    "currency" CHAR(3) NOT NULL,
    "committed_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commitments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."forecast_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "scenario" VARCHAR(32) NOT NULL DEFAULT 'most_likely',
    "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
    "as_of_date" DATE NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forecast_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."forecast_line_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "forecast_version_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,

    CONSTRAINT "forecast_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."evm_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "baseline_id" UUID,
    "reporting_date" DATE NOT NULL,
    "rule_version" INTEGER NOT NULL,
    "bac" DECIMAL(19,4),
    "pv" DECIMAL(19,4),
    "ev" DECIMAL(19,4),
    "ac" DECIMAL(19,4),
    "eac" DECIMAL(19,4),
    "etc" DECIMAL(19,4),
    "vac" DECIMAL(19,4),
    "cv" DECIMAL(19,4),
    "sv" DECIMAL(19,4),
    "cpi" DECIMAL(18,6),
    "spi" DECIMAL(18,6),
    "source_watermark" VARCHAR(256),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evm_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."audit_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID,
    "actor_user_id" UUID,
    "actor_membership_id" UUID,
    "action" VARCHAR(160) NOT NULL,
    "resource_type" VARCHAR(100) NOT NULL,
    "resource_id" UUID,
    "request_id" VARCHAR(128),
    "correlation_id" VARCHAR(128),
    "before_value" JSONB,
    "after_value" JSONB,
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(1024),
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pmcs"."outbox_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "event_type" VARCHAR(160) NOT NULL,
    "aggregate_type" VARCHAR(100) NOT NULL,
    "aggregate_id" UUID,
    "dedupe_key" VARCHAR(256),
    "payload" JSONB NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_status_idx" ON "pmcs"."users"("status");

-- CreateIndex
CREATE INDEX "user_identities_user_id_idx" ON "pmcs"."user_identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_identities_provider_issuer_subject_key" ON "pmcs"."user_identities"("provider", "issuer", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_refresh_token_hash_key" ON "pmcs"."auth_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "auth_sessions_user_expiry_idx" ON "pmcs"."auth_sessions"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "mfa_factors_user_type_idx" ON "pmcs"."mfa_factors"("user_id", "factor_type");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "pmcs"."organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_status_idx" ON "pmcs"."organizations"("status");

-- CreateIndex
CREATE INDEX "departments_org_deleted_idx" ON "pmcs"."departments"("organization_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "departments_organization_id_id_key" ON "pmcs"."departments"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_organization_code_key" ON "pmcs"."departments"("organization_id", "code");

-- CreateIndex
CREATE INDEX "locations_org_deleted_idx" ON "pmcs"."locations"("organization_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "locations_organization_id_id_key" ON "pmcs"."locations"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_organization_code_key" ON "pmcs"."locations"("organization_id", "code");

-- CreateIndex
CREATE INDEX "teams_org_department_idx" ON "pmcs"."teams"("organization_id", "department_id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_organization_id_id_key" ON "pmcs"."teams"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "teams_organization_code_key" ON "pmcs"."teams"("organization_id", "code");

-- CreateIndex
CREATE INDEX "organization_memberships_user_status_idx" ON "pmcs"."organization_memberships"("user_id", "status");

-- CreateIndex
CREATE INDEX "organization_memberships_org_department_idx" ON "pmcs"."organization_memberships"("organization_id", "department_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_memberships_org_id_id_key" ON "pmcs"."organization_memberships"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_memberships_org_user_key" ON "pmcs"."organization_memberships"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "pmcs"."permissions"("code");

-- CreateIndex
CREATE INDEX "roles_org_system_idx" ON "pmcs"."roles"("organization_id", "is_system");

-- CreateIndex
CREATE UNIQUE INDEX "roles_organization_id_id_key" ON "pmcs"."roles"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_organization_code_key" ON "pmcs"."roles"("organization_id", "code");

-- CreateIndex
CREATE INDEX "role_permissions_permission_idx" ON "pmcs"."role_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "membership_roles_org_role_idx" ON "pmcs"."membership_roles"("organization_id", "role_id");

-- CreateIndex
CREATE INDEX "team_memberships_org_member_idx" ON "pmcs"."team_memberships"("organization_id", "membership_id");

-- CreateIndex
CREATE INDEX "portfolios_org_parent_status_idx" ON "pmcs"."portfolios"("organization_id", "parent_portfolio_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "portfolios_organization_id_id_key" ON "pmcs"."portfolios"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "portfolios_organization_code_key" ON "pmcs"."portfolios"("organization_id", "code");

-- CreateIndex
CREATE INDEX "projects_org_portfolio_status_updated_idx" ON "pmcs"."projects"("organization_id", "portfolio_id", "lifecycle_status", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "projects_org_manager_status_idx" ON "pmcs"."projects"("organization_id", "manager_membership_id", "lifecycle_status");

-- CreateIndex
CREATE UNIQUE INDEX "projects_organization_id_id_key" ON "pmcs"."projects"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_organization_code_key" ON "pmcs"."projects"("organization_id", "code");

-- CreateIndex
CREATE INDEX "project_members_org_member_left_idx" ON "pmcs"."project_members"("organization_id", "membership_id", "left_at");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_organization_id_id_key" ON "pmcs"."project_members"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_org_project_member_key" ON "pmcs"."project_members"("organization_id", "project_id", "membership_id");

-- CreateIndex
CREATE INDEX "project_phases_org_project_order_idx" ON "pmcs"."project_phases"("organization_id", "project_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "project_phases_organization_id_id_key" ON "pmcs"."project_phases"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "project_phases_org_project_id_key" ON "pmcs"."project_phases"("organization_id", "project_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "project_phases_org_project_code_key" ON "pmcs"."project_phases"("organization_id", "project_id", "code");

-- CreateIndex
CREATE INDEX "project_health_snapshots_org_project_calc_idx" ON "pmcs"."project_health_snapshots"("organization_id", "project_id", "calculated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "project_health_snapshots_org_id_id_key" ON "pmcs"."project_health_snapshots"("organization_id", "id");

-- CreateIndex
CREATE INDEX "resources_org_type_deleted_idx" ON "pmcs"."resources"("organization_id", "resource_type", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "resources_organization_id_id_key" ON "pmcs"."resources"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "resources_org_membership_key" ON "pmcs"."resources"("organization_id", "membership_id");

-- CreateIndex
CREATE INDEX "wbs_items_org_project_parent_order_idx" ON "pmcs"."wbs_items"("organization_id", "project_id", "parent_wbs_item_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "wbs_items_organization_id_id_key" ON "pmcs"."wbs_items"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "wbs_items_org_project_code_key" ON "pmcs"."wbs_items"("organization_id", "project_id", "code");

-- CreateIndex
CREATE INDEX "tasks_org_project_status_finish_idx" ON "pmcs"."tasks"("organization_id", "project_id", "status", "forecast_finish_date");

-- CreateIndex
CREATE INDEX "tasks_org_owner_status_idx" ON "pmcs"."tasks"("organization_id", "owner_membership_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_organization_id_id_key" ON "pmcs"."tasks"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "tasks_org_project_code_key" ON "pmcs"."tasks"("organization_id", "project_id", "code");

-- CreateIndex
CREATE INDEX "task_dependencies_org_project_successor_idx" ON "pmcs"."task_dependencies"("organization_id", "project_id", "successor_id");

-- CreateIndex
CREATE INDEX "task_dependencies_org_project_predecessor_idx" ON "pmcs"."task_dependencies"("organization_id", "project_id", "predecessor_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_dependencies_organization_id_id_key" ON "pmcs"."task_dependencies"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "task_dependencies_edge_key" ON "pmcs"."task_dependencies"("organization_id", "predecessor_id", "successor_id", "dependency_type");

-- CreateIndex
CREATE INDEX "task_assignments_org_resource_end_idx" ON "pmcs"."task_assignments"("organization_id", "resource_id", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "task_assignments_organization_id_id_key" ON "pmcs"."task_assignments"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "task_assignments_task_resource_role_key" ON "pmcs"."task_assignments"("organization_id", "task_id", "resource_id", "assignment_role");

-- CreateIndex
CREATE INDEX "task_progress_updates_org_task_date_idx" ON "pmcs"."task_progress_updates"("organization_id", "task_id", "reporting_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "task_progress_updates_organization_id_id_key" ON "pmcs"."task_progress_updates"("organization_id", "id");

-- CreateIndex
CREATE INDEX "milestones_org_project_status_date_idx" ON "pmcs"."milestones"("organization_id", "project_id", "status", "planned_date");

-- CreateIndex
CREATE UNIQUE INDEX "milestones_organization_id_id_key" ON "pmcs"."milestones"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "milestones_org_project_code_key" ON "pmcs"."milestones"("organization_id", "project_id", "code");

-- CreateIndex
CREATE INDEX "baselines_org_project_status_idx" ON "pmcs"."baselines"("organization_id", "project_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "baselines_organization_id_id_key" ON "pmcs"."baselines"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "baselines_org_project_id_key" ON "pmcs"."baselines"("organization_id", "project_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "baselines_org_project_number_key" ON "pmcs"."baselines"("organization_id", "project_id", "baseline_number");

-- CreateIndex
CREATE INDEX "baseline_wbs_items_org_project_baseline_idx" ON "pmcs"."baseline_wbs_items"("organization_id", "project_id", "baseline_id");

-- CreateIndex
CREATE UNIQUE INDEX "baseline_wbs_items_org_baseline_code_key" ON "pmcs"."baseline_wbs_items"("organization_id", "baseline_id", "code");

-- CreateIndex
CREATE INDEX "baseline_tasks_org_project_baseline_idx" ON "pmcs"."baseline_tasks"("organization_id", "project_id", "baseline_id");

-- CreateIndex
CREATE UNIQUE INDEX "baseline_tasks_org_baseline_code_key" ON "pmcs"."baseline_tasks"("organization_id", "baseline_id", "code");

-- CreateIndex
CREATE INDEX "baseline_milestones_org_project_baseline_idx" ON "pmcs"."baseline_milestones"("organization_id", "project_id", "baseline_id");

-- CreateIndex
CREATE UNIQUE INDEX "baseline_milestones_org_baseline_code_key" ON "pmcs"."baseline_milestones"("organization_id", "baseline_id", "code");

-- CreateIndex
CREATE INDEX "budget_versions_org_project_status_idx" ON "pmcs"."budget_versions"("organization_id", "project_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "budget_versions_org_id_id_key" ON "pmcs"."budget_versions"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "budget_versions_org_project_id_key" ON "pmcs"."budget_versions"("organization_id", "project_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "budget_versions_org_project_number_key" ON "pmcs"."budget_versions"("organization_id", "project_id", "version_number");

-- CreateIndex
CREATE INDEX "budget_line_items_org_version_period_idx" ON "pmcs"."budget_line_items"("organization_id", "project_id", "budget_version_id", "period_start");

-- CreateIndex
CREATE INDEX "cost_transactions_org_project_date_status_idx" ON "pmcs"."cost_transactions"("organization_id", "project_id", "transaction_date", "posting_status");

-- CreateIndex
CREATE UNIQUE INDEX "cost_transactions_org_id_id_key" ON "pmcs"."cost_transactions"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "cost_transactions_org_project_id_key" ON "pmcs"."cost_transactions"("organization_id", "project_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "cost_transactions_org_external_reference_key" ON "pmcs"."cost_transactions"("organization_id", "external_reference");

-- CreateIndex
CREATE INDEX "cost_transaction_lines_org_transaction_idx" ON "pmcs"."cost_transaction_lines"("organization_id", "project_id", "transaction_id");

-- CreateIndex
CREATE INDEX "commitments_org_project_status_idx" ON "pmcs"."commitments"("organization_id", "project_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "commitments_org_project_reference_key" ON "pmcs"."commitments"("organization_id", "project_id", "reference");

-- CreateIndex
CREATE INDEX "forecast_versions_org_project_asof_idx" ON "pmcs"."forecast_versions"("organization_id", "project_id", "as_of_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "forecast_versions_org_id_id_key" ON "pmcs"."forecast_versions"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "forecast_versions_org_project_id_key" ON "pmcs"."forecast_versions"("organization_id", "project_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "forecast_versions_org_project_number_key" ON "pmcs"."forecast_versions"("organization_id", "project_id", "version_number");

-- CreateIndex
CREATE INDEX "forecast_line_items_org_version_period_idx" ON "pmcs"."forecast_line_items"("organization_id", "project_id", "forecast_version_id", "period_start");

-- CreateIndex
CREATE INDEX "evm_snapshots_org_project_date_idx" ON "pmcs"."evm_snapshots"("organization_id", "project_id", "reporting_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "evm_snapshots_org_project_date_rule_key" ON "pmcs"."evm_snapshots"("organization_id", "project_id", "reporting_date", "rule_version");

-- CreateIndex
CREATE INDEX "audit_events_org_occurred_idx" ON "pmcs"."audit_events"("organization_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "audit_events_org_resource_idx" ON "pmcs"."audit_events"("organization_id", "resource_type", "resource_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "outbox_events_org_processing_idx" ON "pmcs"."outbox_events"("organization_id", "processed_at", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_events_organization_id_id_key" ON "pmcs"."outbox_events"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_events_org_dedupe_key" ON "pmcs"."outbox_events"("organization_id", "dedupe_key");

-- AddForeignKey
ALTER TABLE "pmcs"."user_identities" ADD CONSTRAINT "user_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "pmcs"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."password_credentials" ADD CONSTRAINT "password_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "pmcs"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "pmcs"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."auth_sessions" ADD CONSTRAINT "auth_sessions_replaced_by_id_fkey" FOREIGN KEY ("replaced_by_id") REFERENCES "pmcs"."auth_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."mfa_factors" ADD CONSTRAINT "mfa_factors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "pmcs"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."departments" ADD CONSTRAINT "departments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "pmcs"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."locations" ADD CONSTRAINT "locations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "pmcs"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."teams" ADD CONSTRAINT "teams_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "pmcs"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."teams" ADD CONSTRAINT "teams_organization_id_department_id_fkey" FOREIGN KEY ("organization_id", "department_id") REFERENCES "pmcs"."departments"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "pmcs"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "pmcs"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_department_id_fkey" FOREIGN KEY ("organization_id", "department_id") REFERENCES "pmcs"."departments"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."roles" ADD CONSTRAINT "roles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "pmcs"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."role_permissions" ADD CONSTRAINT "role_permissions_organization_id_role_id_fkey" FOREIGN KEY ("organization_id", "role_id") REFERENCES "pmcs"."roles"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "pmcs"."permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."membership_roles" ADD CONSTRAINT "membership_roles_organization_id_membership_id_fkey" FOREIGN KEY ("organization_id", "membership_id") REFERENCES "pmcs"."organization_memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."membership_roles" ADD CONSTRAINT "membership_roles_organization_id_role_id_fkey" FOREIGN KEY ("organization_id", "role_id") REFERENCES "pmcs"."roles"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."team_memberships" ADD CONSTRAINT "team_memberships_organization_id_team_id_fkey" FOREIGN KEY ("organization_id", "team_id") REFERENCES "pmcs"."teams"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."team_memberships" ADD CONSTRAINT "team_memberships_organization_id_membership_id_fkey" FOREIGN KEY ("organization_id", "membership_id") REFERENCES "pmcs"."organization_memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."portfolios" ADD CONSTRAINT "portfolios_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "pmcs"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."portfolios" ADD CONSTRAINT "portfolios_organization_id_parent_portfolio_id_fkey" FOREIGN KEY ("organization_id", "parent_portfolio_id") REFERENCES "pmcs"."portfolios"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."portfolios" ADD CONSTRAINT "portfolios_organization_id_owner_membership_id_fkey" FOREIGN KEY ("organization_id", "owner_membership_id") REFERENCES "pmcs"."organization_memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."projects" ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "pmcs"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."projects" ADD CONSTRAINT "projects_organization_id_portfolio_id_fkey" FOREIGN KEY ("organization_id", "portfolio_id") REFERENCES "pmcs"."portfolios"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."projects" ADD CONSTRAINT "projects_organization_id_sponsor_membership_id_fkey" FOREIGN KEY ("organization_id", "sponsor_membership_id") REFERENCES "pmcs"."organization_memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."projects" ADD CONSTRAINT "projects_organization_id_manager_membership_id_fkey" FOREIGN KEY ("organization_id", "manager_membership_id") REFERENCES "pmcs"."organization_memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."project_members" ADD CONSTRAINT "project_members_organization_id_project_id_fkey" FOREIGN KEY ("organization_id", "project_id") REFERENCES "pmcs"."projects"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."project_members" ADD CONSTRAINT "project_members_organization_id_membership_id_fkey" FOREIGN KEY ("organization_id", "membership_id") REFERENCES "pmcs"."organization_memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."project_phases" ADD CONSTRAINT "project_phases_organization_id_project_id_fkey" FOREIGN KEY ("organization_id", "project_id") REFERENCES "pmcs"."projects"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."project_health_snapshots" ADD CONSTRAINT "project_health_snapshots_organization_id_project_id_fkey" FOREIGN KEY ("organization_id", "project_id") REFERENCES "pmcs"."projects"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."resources" ADD CONSTRAINT "resources_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "pmcs"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."resources" ADD CONSTRAINT "resources_organization_id_membership_id_fkey" FOREIGN KEY ("organization_id", "membership_id") REFERENCES "pmcs"."organization_memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."resources" ADD CONSTRAINT "resources_organization_id_department_id_fkey" FOREIGN KEY ("organization_id", "department_id") REFERENCES "pmcs"."departments"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."resources" ADD CONSTRAINT "resources_organization_id_team_id_fkey" FOREIGN KEY ("organization_id", "team_id") REFERENCES "pmcs"."teams"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."wbs_items" ADD CONSTRAINT "wbs_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "pmcs"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."wbs_items" ADD CONSTRAINT "wbs_items_organization_id_project_id_fkey" FOREIGN KEY ("organization_id", "project_id") REFERENCES "pmcs"."projects"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."wbs_items" ADD CONSTRAINT "wbs_items_organization_id_phase_id_fkey" FOREIGN KEY ("organization_id", "phase_id") REFERENCES "pmcs"."project_phases"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."wbs_items" ADD CONSTRAINT "wbs_items_organization_id_parent_wbs_item_id_fkey" FOREIGN KEY ("organization_id", "parent_wbs_item_id") REFERENCES "pmcs"."wbs_items"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."wbs_items" ADD CONSTRAINT "wbs_items_organization_id_owner_membership_id_fkey" FOREIGN KEY ("organization_id", "owner_membership_id") REFERENCES "pmcs"."organization_memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."tasks" ADD CONSTRAINT "tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "pmcs"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."tasks" ADD CONSTRAINT "tasks_organization_id_project_id_fkey" FOREIGN KEY ("organization_id", "project_id") REFERENCES "pmcs"."projects"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."tasks" ADD CONSTRAINT "tasks_organization_id_wbs_item_id_fkey" FOREIGN KEY ("organization_id", "wbs_item_id") REFERENCES "pmcs"."wbs_items"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."tasks" ADD CONSTRAINT "tasks_organization_id_parent_task_id_fkey" FOREIGN KEY ("organization_id", "parent_task_id") REFERENCES "pmcs"."tasks"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."tasks" ADD CONSTRAINT "tasks_organization_id_owner_membership_id_fkey" FOREIGN KEY ("organization_id", "owner_membership_id") REFERENCES "pmcs"."organization_memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."task_dependencies" ADD CONSTRAINT "task_dependencies_organization_id_project_id_fkey" FOREIGN KEY ("organization_id", "project_id") REFERENCES "pmcs"."projects"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."task_dependencies" ADD CONSTRAINT "task_dependencies_organization_id_predecessor_id_fkey" FOREIGN KEY ("organization_id", "predecessor_id") REFERENCES "pmcs"."tasks"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."task_dependencies" ADD CONSTRAINT "task_dependencies_organization_id_successor_id_fkey" FOREIGN KEY ("organization_id", "successor_id") REFERENCES "pmcs"."tasks"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."task_assignments" ADD CONSTRAINT "task_assignments_organization_id_project_id_fkey" FOREIGN KEY ("organization_id", "project_id") REFERENCES "pmcs"."projects"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."task_assignments" ADD CONSTRAINT "task_assignments_organization_id_task_id_fkey" FOREIGN KEY ("organization_id", "task_id") REFERENCES "pmcs"."tasks"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."task_assignments" ADD CONSTRAINT "task_assignments_organization_id_resource_id_fkey" FOREIGN KEY ("organization_id", "resource_id") REFERENCES "pmcs"."resources"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."task_progress_updates" ADD CONSTRAINT "task_progress_updates_organization_id_project_id_fkey" FOREIGN KEY ("organization_id", "project_id") REFERENCES "pmcs"."projects"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."task_progress_updates" ADD CONSTRAINT "task_progress_updates_organization_id_task_id_fkey" FOREIGN KEY ("organization_id", "task_id") REFERENCES "pmcs"."tasks"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."task_progress_updates" ADD CONSTRAINT "task_progress_updates_organization_id_reporter_membership__fkey" FOREIGN KEY ("organization_id", "reporter_membership_id") REFERENCES "pmcs"."organization_memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."milestones" ADD CONSTRAINT "milestones_organization_id_project_id_fkey" FOREIGN KEY ("organization_id", "project_id") REFERENCES "pmcs"."projects"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."milestones" ADD CONSTRAINT "milestones_organization_id_phase_id_fkey" FOREIGN KEY ("organization_id", "phase_id") REFERENCES "pmcs"."project_phases"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."milestones" ADD CONSTRAINT "milestones_organization_id_owner_membership_id_fkey" FOREIGN KEY ("organization_id", "owner_membership_id") REFERENCES "pmcs"."organization_memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."baselines" ADD CONSTRAINT "baselines_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "pmcs"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."baselines" ADD CONSTRAINT "baselines_organization_id_project_id_fkey" FOREIGN KEY ("organization_id", "project_id") REFERENCES "pmcs"."projects"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."baselines" ADD CONSTRAINT "baselines_organization_id_created_by_id_fkey" FOREIGN KEY ("organization_id", "created_by_id") REFERENCES "pmcs"."organization_memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."baselines" ADD CONSTRAINT "baselines_organization_id_frozen_by_id_fkey" FOREIGN KEY ("organization_id", "frozen_by_id") REFERENCES "pmcs"."organization_memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."baselines" ADD CONSTRAINT "baselines_organization_id_approved_by_id_fkey" FOREIGN KEY ("organization_id", "approved_by_id") REFERENCES "pmcs"."organization_memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."baseline_wbs_items" ADD CONSTRAINT "baseline_wbs_items_organization_id_project_id_baseline_id_fkey" FOREIGN KEY ("organization_id", "project_id", "baseline_id") REFERENCES "pmcs"."baselines"("organization_id", "project_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."baseline_tasks" ADD CONSTRAINT "baseline_tasks_organization_id_project_id_baseline_id_fkey" FOREIGN KEY ("organization_id", "project_id", "baseline_id") REFERENCES "pmcs"."baselines"("organization_id", "project_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."baseline_milestones" ADD CONSTRAINT "baseline_milestones_organization_id_project_id_baseline_id_fkey" FOREIGN KEY ("organization_id", "project_id", "baseline_id") REFERENCES "pmcs"."baselines"("organization_id", "project_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."budget_versions" ADD CONSTRAINT "budget_versions_organization_id_project_id_fkey" FOREIGN KEY ("organization_id", "project_id") REFERENCES "pmcs"."projects"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."budget_versions" ADD CONSTRAINT "budget_versions_organization_id_created_by_id_fkey" FOREIGN KEY ("organization_id", "created_by_id") REFERENCES "pmcs"."organization_memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."budget_line_items" ADD CONSTRAINT "budget_line_items_organization_id_project_id_budget_versio_fkey" FOREIGN KEY ("organization_id", "project_id", "budget_version_id") REFERENCES "pmcs"."budget_versions"("organization_id", "project_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."cost_transactions" ADD CONSTRAINT "cost_transactions_organization_id_project_id_fkey" FOREIGN KEY ("organization_id", "project_id") REFERENCES "pmcs"."projects"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."cost_transactions" ADD CONSTRAINT "cost_transactions_organization_id_created_by_id_fkey" FOREIGN KEY ("organization_id", "created_by_id") REFERENCES "pmcs"."organization_memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."cost_transactions" ADD CONSTRAINT "cost_transactions_organization_id_reversal_of_id_fkey" FOREIGN KEY ("organization_id", "reversal_of_id") REFERENCES "pmcs"."cost_transactions"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."cost_transaction_lines" ADD CONSTRAINT "cost_transaction_lines_organization_id_project_id_transact_fkey" FOREIGN KEY ("organization_id", "project_id", "transaction_id") REFERENCES "pmcs"."cost_transactions"("organization_id", "project_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."commitments" ADD CONSTRAINT "commitments_organization_id_project_id_fkey" FOREIGN KEY ("organization_id", "project_id") REFERENCES "pmcs"."projects"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."commitments" ADD CONSTRAINT "commitments_organization_id_created_by_id_fkey" FOREIGN KEY ("organization_id", "created_by_id") REFERENCES "pmcs"."organization_memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."forecast_versions" ADD CONSTRAINT "forecast_versions_organization_id_project_id_fkey" FOREIGN KEY ("organization_id", "project_id") REFERENCES "pmcs"."projects"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."forecast_versions" ADD CONSTRAINT "forecast_versions_organization_id_created_by_id_fkey" FOREIGN KEY ("organization_id", "created_by_id") REFERENCES "pmcs"."organization_memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."forecast_line_items" ADD CONSTRAINT "forecast_line_items_organization_id_project_id_forecast_ve_fkey" FOREIGN KEY ("organization_id", "project_id", "forecast_version_id") REFERENCES "pmcs"."forecast_versions"("organization_id", "project_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."evm_snapshots" ADD CONSTRAINT "evm_snapshots_organization_id_project_id_fkey" FOREIGN KEY ("organization_id", "project_id") REFERENCES "pmcs"."projects"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."evm_snapshots" ADD CONSTRAINT "evm_snapshots_organization_id_baseline_id_fkey" FOREIGN KEY ("organization_id", "baseline_id") REFERENCES "pmcs"."baselines"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."audit_events" ADD CONSTRAINT "audit_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "pmcs"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."audit_events" ADD CONSTRAINT "audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "pmcs"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."audit_events" ADD CONSTRAINT "audit_events_organization_id_actor_membership_id_fkey" FOREIGN KEY ("organization_id", "actor_membership_id") REFERENCES "pmcs"."organization_memberships"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pmcs"."outbox_events" ADD CONSTRAINT "outbox_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "pmcs"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


