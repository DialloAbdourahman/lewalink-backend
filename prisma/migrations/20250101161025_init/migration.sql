-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('Admin', 'Client', 'Editor');

-- CreateEnum
CREATE TYPE "SchoolType" AS ENUM ('PublicStateUniversity');

-- CreateEnum
CREATE TYPE "ProgramType" AS ENUM ('HND', 'BTECH', 'LICENCE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "type" "UserType" NOT NULL,
    "token" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "adminId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SchoolType" NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "visits" INTEGER NOT NULL DEFAULT 0,
    "email" TEXT,
    "phoneNumber" TEXT,
    "website" TEXT,
    "description" TEXT,
    "pictures" TEXT[],
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ProgramType" NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolProgram" (
    "id" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "visits" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "creatorId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,

    CONSTRAINT "SchoolProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolProgramCourse" (
    "id" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "courseId" TEXT NOT NULL,
    "schoolProgramId" TEXT NOT NULL,

    CONSTRAINT "SchoolProgramCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolRating" (
    "id" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "clientId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,

    CONSTRAINT "SchoolRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolProgramRating" (
    "id" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "clientId" TEXT NOT NULL,
    "schoolProgramId" TEXT NOT NULL,

    CONSTRAINT "SchoolProgramRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "School_name_key" ON "School"("name");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolProgram" ADD CONSTRAINT "SchoolProgram_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolProgram" ADD CONSTRAINT "SchoolProgram_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolProgram" ADD CONSTRAINT "SchoolProgram_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolProgramCourse" ADD CONSTRAINT "SchoolProgramCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolProgramCourse" ADD CONSTRAINT "SchoolProgramCourse_schoolProgramId_fkey" FOREIGN KEY ("schoolProgramId") REFERENCES "SchoolProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolRating" ADD CONSTRAINT "SchoolRating_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolRating" ADD CONSTRAINT "SchoolRating_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolProgramRating" ADD CONSTRAINT "SchoolProgramRating_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolProgramRating" ADD CONSTRAINT "SchoolProgramRating_schoolProgramId_fkey" FOREIGN KEY ("schoolProgramId") REFERENCES "SchoolProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
