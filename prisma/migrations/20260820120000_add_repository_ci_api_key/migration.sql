-- AlterTable
ALTER TABLE "repositories" ADD COLUMN "ci_api_key_hash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "repositories_ci_api_key_hash_key" ON "repositories"("ci_api_key_hash");
