-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "replaced_by_token_id" TEXT,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repositories" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "local_path" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_audit_at" TIMESTAMP(3),

    CONSTRAINT "repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audits" (
    "id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,
    "triggered_by" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "commit_sha" TEXT,
    "provider" TEXT,
    "model" TEXT,
    "health_score" INTEGER,
    "critical_count" INTEGER,
    "medium_count" INTEGER,
    "low_count" INTEGER,
    "estimated_debt_hours" DECIMAL(12,6),
    "total_findings" INTEGER,
    "duration_ms" INTEGER,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error_message" TEXT,

    CONSTRAINT "audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "findings" (
    "id" TEXT NOT NULL,
    "audit_id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "likelihood" DOUBLE PRECISION,
    "message" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "line_number" INTEGER,
    "column_number" INTEGER,
    "metadata" JSONB DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'open',

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_suggestions" (
    "id" TEXT NOT NULL,
    "audit_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "target_file" TEXT,
    "target_line" INTEGER,
    "code_blocks" JSONB DEFAULT '[]',
    "model_reasoning" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_summaries" (
    "id" TEXT NOT NULL,
    "audit_id" TEXT NOT NULL,
    "module_name" TEXT NOT NULL,
    "module_score" INTEGER NOT NULL,
    "finding_count" INTEGER NOT NULL,
    "breakdown" JSONB DEFAULT '{}',

    CONSTRAINT "module_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_usages" (
    "id" TEXT NOT NULL,
    "audit_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "estimated_cost" DECIMAL(12,6),
    "latency_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_user" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "idx_repositories_owner" ON "repositories"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_repositories_owner_provider_url" ON "repositories"("owner_id", "provider", "url");

-- CreateIndex
CREATE INDEX "idx_audits_repository_started" ON "audits"("repository_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "idx_findings_audit_severity" ON "findings"("audit_id", "severity");

-- CreateIndex
CREATE INDEX "idx_findings_audit_file" ON "findings"("audit_id", "file_path");

-- CreateIndex
CREATE INDEX "idx_ai_suggestions_audit" ON "ai_suggestions"("audit_id");

-- CreateIndex
CREATE INDEX "idx_module_summaries_audit" ON "module_summaries"("audit_id");

-- CreateIndex
CREATE INDEX "idx_llm_usages_audit" ON "llm_usages"("audit_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_summaries" ADD CONSTRAINT "module_summaries_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_usages" ADD CONSTRAINT "llm_usages_audit_id_fkey" FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

