FROM python:3.13-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY alembic.ini .
COPY alembic ./alembic
COPY app ./app
COPY entrypoint.sh .

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Set ownership and permissions
RUN chown -R appuser:appuser /app
RUN chmod +x /app/entrypoint.sh
RUN mkdir -p /app/reports && chown -R appuser:appuser /app/reports

# Switch to non-root user
USER appuser

CMD ["./entrypoint.sh"]
