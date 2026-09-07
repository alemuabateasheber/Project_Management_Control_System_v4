# ADR-005: Audit trail and transactional outbox

**Status:** Proposed

## Context

Controlled PMCS operations—such as baselines, financial postings, approvals,
and workflow transitions—need durable evidence and reliable downstream work.
Writing an audit record or publishing a notification after the business
transaction commits can lose evidence or events when a process fails between
steps. Directly publishing to a queue inside a database transaction can also
produce inconsistent outcomes.

## Decision

For every controlled mutation, write the business change, its redacted audit
event, and any domain outbox event in one PostgreSQL transaction. Audit events
record organization, actor membership, action, entity identity, request or
correlation ID, timestamps, permitted before/after values, and relevant source
metadata. Audit data is append-only; the application role cannot update or
delete it, and sensitive values are redacted before persistence.

Persist outbox rows durably with event type, aggregate identity, payload,
deduplication key, attempt state, and timestamps. A worker claims rows and
delivers jobs to Redis/BullMQ or an external integration. Consumers are
idempotent, retry with backoff, and move repeatedly failed work to a
dead-letter path. Audit capture is synchronous and transactional; notification,
email, report, search, and recalculation work is asynchronous.

## Alternatives considered

- **Publish directly to Redis or email from request handlers:** simple, but
  loses work when the process or broker fails at the wrong time.
- **Create audit records asynchronously:** cannot prove every committed
  controlled action has evidence.
- **Use distributed transactions with every broker/integration:** adds
  substantial complexity and operational coupling without improving the
  initial delivery model.

## Consequences

- Mutations have a small additional transactional write cost but gain
  traceability and reliable event handoff.
- Worker processing is at-least-once, so handlers need idempotency keys and
  observable retry/dead-letter behavior.
- Audit retention, redaction policy, append-only database protections, and
  outbox backlog monitoring become production operating responsibilities.
- Financial corrections, approved baseline changes, and approval decisions use
  controlled reversals or superseding records instead of silent overwrites.

