/*
  Warnings:

  - Added the required column `field` to the `Program` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProgramField" AS ENUM ('SCIENCE', 'TECHNOLOGY', 'HEALTH');

-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "field" "ProgramField" NOT NULL;
