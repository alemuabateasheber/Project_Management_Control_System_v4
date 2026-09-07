FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install dependencies before application code so dependency layers remain cacheable.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# The service does not need root privileges at runtime.
RUN groupadd --system appuser \
    && useradd --system --gid appuser --create-home appuser \
    && install --directory --owner=appuser --group=appuser --mode=0750 /app/reports

COPY --chown=appuser:appuser alembic.ini .
COPY --chown=appuser:appuser alembic ./alembic
COPY --chown=appuser:appuser app ./app
COPY --chown=appuser:appuser entrypoint.sh .
RUN chmod 0550 /app/entrypoint.sh

USER appuser

EXPOSE 8000

CMD ["./entrypoint.sh"]
