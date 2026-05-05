-- Add PerplexityAccount table for Cardvela Pro pool management
-- Run on production DB before deploying the new app version.
-- Idempotent: uses IF NOT EXISTS / IF NOT EXISTS clauses.

CREATE TABLE IF NOT EXISTS "PerplexityAccount" (
  "id"               TEXT        NOT NULL,
  "email"            TEXT        NOT NULL,
  "password"         TEXT,
  "cookie"           TEXT        NOT NULL,
  "port"             INTEGER     NOT NULL,
  "newApiChannelId"  INTEGER,
  "apiKey"           TEXT,
  "accountType"      TEXT        NOT NULL DEFAULT 'pro',
  "status"           TEXT        NOT NULL DEFAULT 'active',
  "expiresAt"        TIMESTAMP(3),
  "lastCheckAt"      TIMESTAMP(3),
  "lastError"        TEXT,
  "notes"            TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PerplexityAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PerplexityAccount_email_key" ON "PerplexityAccount"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "PerplexityAccount_port_key"  ON "PerplexityAccount"("port");
CREATE INDEX        IF NOT EXISTS "PerplexityAccount_status_idx"    ON "PerplexityAccount"("status");
CREATE INDEX        IF NOT EXISTS "PerplexityAccount_expiresAt_idx" ON "PerplexityAccount"("expiresAt");
