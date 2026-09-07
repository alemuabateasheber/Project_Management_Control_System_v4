-- PMCS PostgreSQL hardening
-- Apply after the Prisma-managed tables exist in the pmcs schema.
-- This migration is intentionally reviewed SQL: Prisma cannot express RLS,
-- append-only protections, extensions, or database roles.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS pmcs;

CREATE OR REPLACE FUNCTION pmcs.current_organization_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  value text;
BEGIN
  value := current_setting('pmcs.organization_id', true);
  IF value IS NULL OR value = '' THEN
    RETURN NULL;
  END IF;
  RETURN value::uuid;
END;
$$;

CREATE OR REPLACE FUNCTION pmcs.current_membership_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  value text;
BEGIN
  value := current_setting('pmcs.membership_id', true);
  IF value IS NULL OR value = '' THEN
    RETURN NULL;
  END IF;
  RETURN value::uuid;
END;
$$;

-- Authentication must establish membership before ordinary tenant RLS can be
-- enabled. This narrowly scoped function is the only unscoped membership
-- lookup available to the application role; callers supply an already
-- authenticated user identity and an optional active organization selector.
CREATE OR REPLACE FUNCTION pmcs.resolve_active_membership(
  p_user_id uuid,
  p_organization_slug text DEFAULT NULL,
  p_organization_id uuid DEFAULT NULL
)
RETURNS TABLE (organization_id uuid, membership_id uuid, user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pmcs, pg_temp
AS $$
  SELECT membership.organization_id, membership.id, membership.user_id
  FROM pmcs.organization_memberships AS membership
  INNER JOIN pmcs.organizations AS organization ON organization.id = membership.organization_id
  WHERE membership.user_id = p_user_id
    AND membership.status = 'active'
    AND membership.ended_at IS NULL
    AND organization.status = 'active'
    AND (p_organization_slug IS NULL OR organization.slug = p_organization_slug)
    AND (p_organization_id IS NULL OR membership.organization_id = p_organization_id)
  ORDER BY organization.slug;
$$;

REVOKE ALL ON FUNCTION pmcs.resolve_active_membership(uuid, text, uuid) FROM PUBLIC;

-- Tenant tables must be protected even when a repository forgets a predicate.
DO $$
DECLARE
  table_name text;
  policy_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'organizations', 'departments', 'locations', 'teams',
    'organization_memberships', 'roles', 'role_permissions',
    'membership_roles', 'team_memberships', 'portfolios', 'projects',
    'project_members', 'project_phases', 'project_health_snapshots',
    'resources', 'wbs_items', 'tasks', 'task_dependencies',
    'task_assignments', 'task_progress_updates', 'milestones', 'baselines',
    'baseline_wbs_items', 'baseline_tasks', 'baseline_milestones',
    'budget_versions', 'budget_line_items', 'cost_transactions',
    'cost_transaction_lines', 'commitments', 'forecast_versions',
    'forecast_line_items', 'evm_snapshots', 'audit_events', 'outbox_events'
    , 'funds', 'transaction_categories', 'financial_transactions',
    'ledger_entries', 'fund_transfers', 'currency_conversions', 'budgets',
    'budget_alert_rules'
  ] LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns AS columns
      WHERE columns.table_schema = 'pmcs'
        AND columns.table_name = table_name
        AND columns.column_name = 'organization_id'
    ) THEN
      EXECUTE format('ALTER TABLE pmcs.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('ALTER TABLE pmcs.%I FORCE ROW LEVEL SECURITY', table_name);
      policy_name := table_name || '_tenant_isolation';

      IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'pmcs'
          AND tablename = table_name
          AND policyname = policy_name
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I ON pmcs.%I USING (organization_id = pmcs.current_organization_id()) WITH CHECK (organization_id = pmcs.current_organization_id())',
          policy_name,
          table_name
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Audit events, approved baseline snapshots, and posted financial records are
-- evidence. Corrections use new records, reversals, or superseding versions.
CREATE OR REPLACE FUNCTION pmcs.reject_immutable_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'PMCS record is immutable: %.%', TG_TABLE_SCHEMA, TG_TABLE_NAME
    USING ERRCODE = '55006';
END;
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'audit_events', 'baseline_wbs_items', 'baseline_tasks',
    'baseline_milestones', 'cost_transaction_lines', 'ledger_entries'
  ] LOOP
    IF to_regclass('pmcs.' || table_name) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON pmcs.%I', table_name || '_immutable', table_name);
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON pmcs.%I FOR EACH ROW EXECUTE FUNCTION pmcs.reject_immutable_mutation()',
        table_name || '_immutable',
        table_name
      );
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION pmcs.reject_completed_financial_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE'
      OR OLD.status = 'reversed'
      OR (OLD.status = 'completed' AND NEW.status <> 'reversed') THEN
    RAISE EXCEPTION 'Completed financial transaction is immutable: %', OLD.id
      USING ERRCODE = '55006';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS financial_transactions_immutable ON pmcs.financial_transactions;
CREATE TRIGGER financial_transactions_immutable
BEFORE UPDATE OR DELETE ON pmcs.financial_transactions
FOR EACH ROW EXECUTE FUNCTION pmcs.reject_completed_financial_mutation();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_percent_complete_range') THEN
    ALTER TABLE pmcs.tasks ADD CONSTRAINT tasks_percent_complete_range CHECK (percent_complete >= 0 AND percent_complete <= 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wbs_items_percent_complete_range') THEN
    ALTER TABLE pmcs.wbs_items ADD CONSTRAINT wbs_items_percent_complete_range CHECK (percent_complete >= 0 AND percent_complete <= 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_progress_percent_complete_range') THEN
    ALTER TABLE pmcs.task_progress_updates ADD CONSTRAINT task_progress_percent_complete_range CHECK (percent_complete >= 0 AND percent_complete <= 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_date_order') THEN
    ALTER TABLE pmcs.projects ADD CONSTRAINT projects_date_order CHECK (planned_start_date IS NULL OR planned_finish_date IS NULL OR planned_start_date <= planned_finish_date);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_date_order') THEN
    ALTER TABLE pmcs.tasks ADD CONSTRAINT tasks_date_order CHECK (planned_start_date IS NULL OR planned_finish_date IS NULL OR planned_start_date <= planned_finish_date);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'milestones_date_order') THEN
    ALTER TABLE pmcs.milestones ADD CONSTRAINT milestones_date_order CHECK (planned_date IS NULL OR forecast_date IS NULL OR planned_date <= forecast_date);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'task_dependencies_not_self') THEN
    ALTER TABLE pmcs.task_dependencies ADD CONSTRAINT task_dependencies_not_self CHECK (predecessor_task_id <> successor_task_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cost_transactions_total_nonnegative') THEN
    ALTER TABLE pmcs.cost_transactions ADD CONSTRAINT cost_transactions_total_nonnegative CHECK (total_amount >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cost_transaction_lines_amount_nonnegative') THEN
    ALTER TABLE pmcs.cost_transaction_lines ADD CONSTRAINT cost_transaction_lines_amount_nonnegative CHECK (amount >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'budget_line_items_amounts_nonnegative') THEN
    ALTER TABLE pmcs.budget_line_items ADD CONSTRAINT budget_line_items_amounts_nonnegative CHECK (
      planned_amount >= 0
      AND (approved_amount IS NULL OR approved_amount >= 0)
      AND (contingency_amount IS NULL OR contingency_amount >= 0)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commitments_amounts_nonnegative') THEN
    ALTER TABLE pmcs.commitments ADD CONSTRAINT commitments_amounts_nonnegative CHECK (
      committed_amount >= 0
      AND (released_amount IS NULL OR released_amount >= 0)
    );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'funds_supported_currency') THEN
    ALTER TABLE pmcs.funds ADD CONSTRAINT funds_supported_currency CHECK (currency IN ('EUR', 'ETB'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'funds_balances_nonnegative') THEN
    ALTER TABLE pmcs.funds ADD CONSTRAINT funds_balances_nonnegative CHECK (
      opening_balance >= 0 AND (allow_overdraft OR current_balance >= 0)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ledger_entries_supported_currency') THEN
    ALTER TABLE pmcs.ledger_entries ADD CONSTRAINT ledger_entries_supported_currency CHECK (currency IN ('EUR', 'ETB'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ledger_entries_positive_amount') THEN
    ALTER TABLE pmcs.ledger_entries ADD CONSTRAINT ledger_entries_positive_amount CHECK (amount > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ledger_entries_direction') THEN
    ALTER TABLE pmcs.ledger_entries ADD CONSTRAINT ledger_entries_direction CHECK (direction IN ('DEBIT', 'CREDIT'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ledger_entries_role') THEN
    ALTER TABLE pmcs.ledger_entries ADD CONSTRAINT ledger_entries_role CHECK (entry_role IN ('FUND', 'OFFSET'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ledger_entries_balance_by_role') THEN
    ALTER TABLE pmcs.ledger_entries ADD CONSTRAINT ledger_entries_balance_by_role CHECK (
      (entry_role = 'FUND' AND fund_id IS NOT NULL AND balance_before IS NOT NULL AND balance_after IS NOT NULL)
      OR (entry_role = 'OFFSET' AND fund_id IS NULL AND balance_before IS NULL AND balance_after IS NULL)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'financial_transactions_type') THEN
    ALTER TABLE pmcs.financial_transactions ADD CONSTRAINT financial_transactions_type CHECK (
      transaction_type IN ('INCOME', 'EXPENSE', 'FUND_TRANSFER', 'CURRENCY_CONVERSION', 'ADJUSTMENT', 'REFUND', 'REVERSAL')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'financial_transactions_status') THEN
    ALTER TABLE pmcs.financial_transactions ADD CONSTRAINT financial_transactions_status CHECK (
      status IN ('DRAFT', 'PENDING', 'APPROVED', 'COMPLETED', 'CANCELLED', 'REVERSED')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fund_transfers_positive_values') THEN
    ALTER TABLE pmcs.fund_transfers ADD CONSTRAINT fund_transfers_positive_values CHECK (
      source_amount > 0 AND destination_amount > 0 AND fee >= 0
      AND (exchange_rate IS NULL OR exchange_rate > 0)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fund_transfers_distinct_funds') THEN
    ALTER TABLE pmcs.fund_transfers ADD CONSTRAINT fund_transfers_distinct_funds CHECK (source_fund_id <> destination_fund_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'currency_conversions_positive_values') THEN
    ALTER TABLE pmcs.currency_conversions ADD CONSTRAINT currency_conversions_positive_values CHECK (
      source_amount > 0 AND destination_amount > 0 AND exchange_rate > 0
      AND conversion_fee >= 0 AND total_source_cost >= source_amount
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'currency_conversions_distinct_currencies') THEN
    ALTER TABLE pmcs.currency_conversions ADD CONSTRAINT currency_conversions_distinct_currencies CHECK (
      source_currency <> destination_currency
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'budgets_positive_amount') THEN
    ALTER TABLE pmcs.budgets ADD CONSTRAINT budgets_positive_amount CHECK (budget_amount > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'budgets_date_order') THEN
    ALTER TABLE pmcs.budgets ADD CONSTRAINT budgets_date_order CHECK (start_date <= end_date);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'budget_alert_rules_threshold') THEN
    ALTER TABLE pmcs.budget_alert_rules ADD CONSTRAINT budget_alert_rules_threshold CHECK (
      threshold_percent > 0 AND threshold_percent <= 100
    );
  END IF;
END;
$$;

-- The application role must not bypass RLS. Deployments may create this role
-- separately; the guard below avoids failing when the role is provisioned later.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pmcs_app') THEN
    ALTER ROLE pmcs_app NOSUPERUSER NOBYPASSRLS;
    GRANT USAGE ON SCHEMA pmcs TO pmcs_app;
    GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA pmcs TO pmcs_app;
    REVOKE DELETE ON ALL TABLES IN SCHEMA pmcs FROM pmcs_app;
    GRANT EXECUTE ON FUNCTION pmcs.resolve_active_membership(uuid, text, uuid) TO pmcs_app;
  END IF;
END;
$$;
