/*
  Warnings:

  - You are about to drop the `SchoolProgramCourse` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SchoolProgramCourse" DROP CONSTRAINT "SchoolProgramCourse_courseId_fkey";

-- DropForeignKey
ALTER TABLE "SchoolProgramCourse" DROP CONSTRAINT "SchoolProgramCourse_schoolProgramId_fkey";

-- DropTable
DROP TABLE "SchoolProgramCourse";

-- CreateTable
CREATE TABLE "ProgramCourse" (
    "id" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "courseId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,

    CONSTRAINT "ProgramCourse_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProgramCourse" ADD CONSTRAINT "ProgramCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramCourse" ADD CONSTRAINT "ProgramCourse_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
