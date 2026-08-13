-- Migration: add_bug014_015_fields
-- Adds filesToDelete to Plan (BUG-014) and planId/repositoryId to ChatSession (BUG-015)

-- AlterTable
ALTER TABLE "chat_sessions" ADD COLUMN "planId" TEXT,
ADD COLUMN "repositoryId" TEXT;

-- AlterTable
ALTER TABLE "plans" ADD COLUMN "filesToDelete" TEXT;
