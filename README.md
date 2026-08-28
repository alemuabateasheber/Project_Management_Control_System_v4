# MInT / AICS PMO Control System v4

Production-oriented full-stack PMO application based on the MInT/AICS 3-Year Project Management & PMO Control System workbook.

## v4 capabilities

- React + Vite PMO interface with production nginx build
- FastAPI REST API with enhanced security
- PostgreSQL 17 with performance-optimized indexes
- Alembic database migrations
- JWT authentication and role-based access control
- Roles: viewer, editor, project_manager, approver, admin
- User administration and account activation/deactivation
- Password change endpoint with rate limiting
- Immutable-style audit event capture for core PMO operations
- Approval workflow with notifications
- Master workbook import/upsert with file size limits
- API synchronization endpoint
- PDF and Excel management-report generation
- Scheduled report execution with optional SMTP email delivery
- Report run history
- Notification center
- Docker Compose deployment with security hardening
- Comprehensive logging and monitoring
- Response caching for performance optimization

## Security Features

- **Authentication**: JWT with bcrypt password hashing, minimum 32-character secret validation
- **Rate Limiting**: Configurable limits on authentication and sensitive endpoints
- **Container Security**: Non-root user execution, resource limits, health checks
- **Web Security**: Content Security Policy, security headers, CORS restrictions
- **Input Validation**: File size limits, data validation, SQL injection prevention
- **Audit Logging**: Comprehensive audit trail for all critical operations
- **Error Handling**: Secure error messages without exposing sensitive information

## Run

```bash
cp .env.example .env
# Set a strong JWT_SECRET (min 32 chars) and ADMIN_PASSWORD (min 8 chars)

docker compose up --build
```

Web: http://localhost:8081
API: http://localhost:8001 (proxied through nginx at /api)
OpenAPI: http://localhost:8001/docs

## First login

Use the administrator credentials configured by `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env`. Change the password immediately after first login.

## Database Migrations

The application automatically runs Alembic migrations on startup. Migration files are located in `backend/alembic/versions/`. The latest migration includes performance-optimized composite indexes for common query patterns.

## Backup and Recovery

### Creating Backups

```bash
# Run the backup script
./ops/backup.sh
```

### Verifying Backups

```bash
# Verify backup integrity
./ops/verify-backup.sh backups/mint_aics_pmo_YYYYMMDD_HHMMSS.dump
```

### Restoring from Backup

See `ops/restore.md` for detailed restore instructions.

## Production checklist

1. **Security Configuration**

   - Use a randomly generated JWT secret of at least 32 characters
   - Replace the sample PostgreSQL password with a strong password
   - Set a strong ADMIN_PASSWORD (minimum 8 characters)
   - Restrict CORS to the production UI origin
2. **Network Security**

   - Put the web/API behind HTTPS and a reverse proxy
   - Configure PostgreSQL TLS for database connections
   - Implement network segmentation for government production environments
   - Review and restrict firewall rules
3. **Operational Setup**

   - Configure SMTP only if scheduled email reports are required
   - Set up centralized log collection and infrastructure monitoring
   - Configure health check monitoring
   - Set up automated backup verification
4. **Data Management**

   - Back up the PostgreSQL volume and the report volume regularly
   - Test backup restoration procedures
   - Configure retention policies for backups and logs
   - Monitor database storage and performance
5. **Application Configuration**

   - Run migrations as part of deployment; never use `Base.metadata.create_all()` in production
   - Review RBAC assignments and approval delegation before go-live
   - Configure appropriate resource limits for containers
   - Set up proper error tracking and alerting
6. **Performance Optimization**

   - Monitor cache hit ratios for cached endpoints
   - Review database query performance with new indexes
   - Adjust rate limiting thresholds based on traffic patterns
   - Optimize nginx configuration for production load

## Monitoring and Maintenance

### Health Checks

- Web service: `http://localhost:8081/health`
- API service: `http://localhost:8001/api/health`
- Database: Configured via Docker health checks

### Logs

- Application logs: Available via `docker compose logs api`
- Structured logging with timestamps and log levels
- Security events logged for authentication failures and unauthorized access

### Performance Monitoring

- Response caching on read-only endpoints (30-60 second TTL)
- Database query optimization with composite indexes
- Container resource limits for stability

## Development Notes

- Frontend uses Vite for development builds, nginx for production
- Backend runs as non-root user in production containers
- All sensitive configuration via environment variables
- No hardcoded credentials in source code
- Comprehensive audit logging for compliance

