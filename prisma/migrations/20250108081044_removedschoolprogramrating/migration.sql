/*
  Warnings:

  - You are about to drop the `SchoolProgramRating` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SchoolProgramRating" DROP CONSTRAINT "SchoolProgramRating_clientId_fkey";

-- DropForeignKey
ALTER TABLE "SchoolProgramRating" DROP CONSTRAINT "SchoolProgramRating_schoolProgramId_fkey";

-- DropTable
DROP TABLE "SchoolProgramRating";
