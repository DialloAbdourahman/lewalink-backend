/*
  Warnings:

  - Added the required column `currency` to the `SchoolProgram` table without a default value. This is not possible if the table is not empty.
  - Made the column `price` on table `SchoolProgram` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "SchoolProgram" ADD COLUMN     "currency" "Currency" NOT NULL,
ALTER COLUMN "price" SET NOT NULL;
