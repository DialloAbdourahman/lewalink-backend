/*
  Warnings:

  - You are about to drop the column `visits` on the `SchoolProgram` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code]` on the table `Course` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Program` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "SchoolProgram" DROP COLUMN "visits";

-- CreateIndex
CREATE UNIQUE INDEX "Course_code_key" ON "Course"("code");

-- CreateIndex
CREATE INDEX "Course_title_isDeleted_idx" ON "Course"("title", "isDeleted");

-- CreateIndex
CREATE INDEX "Course_credits_idx" ON "Course"("credits");

-- CreateIndex
CREATE INDEX "Course_title_idx" ON "Course"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Program_name_key" ON "Program"("name");

-- CreateIndex
CREATE INDEX "Program_isDeleted_idx" ON "Program"("isDeleted");

-- CreateIndex
CREATE INDEX "Program_name_idx" ON "Program"("name");

-- CreateIndex
CREATE INDEX "Program_field_idx" ON "Program"("field");

-- CreateIndex
CREATE INDEX "Program_type_idx" ON "Program"("type");

-- CreateIndex
CREATE INDEX "ProgramCourse_courseId_isDeleted_idx" ON "ProgramCourse"("courseId", "isDeleted");

-- CreateIndex
CREATE INDEX "ProgramCourse_programId_isDeleted_idx" ON "ProgramCourse"("programId", "isDeleted");

-- CreateIndex
CREATE INDEX "ProgramCourse_courseId_programId_idx" ON "ProgramCourse"("courseId", "programId");

-- CreateIndex
CREATE INDEX "School_isDeleted_type_idx" ON "School"("isDeleted", "type");

-- CreateIndex
CREATE INDEX "School_name_idx" ON "School"("name");

-- CreateIndex
CREATE INDEX "School_country_idx" ON "School"("country");

-- CreateIndex
CREATE INDEX "School_city_idx" ON "School"("city");

-- CreateIndex
CREATE INDEX "School_rating_idx" ON "School"("rating");

-- CreateIndex
CREATE INDEX "School_visits_idx" ON "School"("visits");

-- CreateIndex
CREATE INDEX "School_longitude_latitude_idx" ON "School"("longitude", "latitude");

-- CreateIndex
CREATE INDEX "SchoolProgram_schoolId_isDeleted_idx" ON "SchoolProgram"("schoolId", "isDeleted");

-- CreateIndex
CREATE INDEX "SchoolProgram_programId_isDeleted_idx" ON "SchoolProgram"("programId", "isDeleted");

-- CreateIndex
CREATE INDEX "SchoolProgram_price_idx" ON "SchoolProgram"("price");

-- CreateIndex
CREATE INDEX "SchoolProgram_schoolId_programId_idx" ON "SchoolProgram"("schoolId", "programId");

-- CreateIndex
CREATE INDEX "SchoolRating_schoolId_isDeleted_idx" ON "SchoolRating"("schoolId", "isDeleted");

-- CreateIndex
CREATE INDEX "SchoolRating_schoolId_clientId_isDeleted_idx" ON "SchoolRating"("schoolId", "clientId", "isDeleted");

-- CreateIndex
CREATE INDEX "User_token_idx" ON "User"("token");

-- CreateIndex
CREATE INDEX "User_name_type_idx" ON "User"("name", "type");

-- CreateIndex
CREATE INDEX "User_isDeleted_type_idx" ON "User"("isDeleted", "type");
