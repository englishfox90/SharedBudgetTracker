/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `accounts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `accounts` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Create a default user for existing account
-- Password is hashed version of 'changeme123' - you'll want to change this after first login
INSERT INTO "users" ("email", "password", "name", "createdAt", "updatedAt")
VALUES ('user@example.com', '$2a$10$rOQE4KqVvKb5T5VZx8qk0.OqNZVZ9YhVxYh8Z6E5yXl3r9eN8Z9Aq', 'Default User', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable - Add userId column with temporary default
ALTER TABLE "accounts" ADD COLUMN "userId" INTEGER;

-- Link existing account to the default user
UPDATE "accounts" SET "userId" = 1 WHERE "userId" IS NULL;

-- Make userId NOT NULL after populating it
ALTER TABLE "accounts" ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "accounts_userId_key" ON "accounts"("userId");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
