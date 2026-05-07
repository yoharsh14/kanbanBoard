/*
  Warnings:

  - You are about to drop the columnName `columnName` on the `Task` table. All the data in the columnName will be lost.
  - Added the required columnName `columnName` to the `Task` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Task" ADD COLUMN "columnName" TEXT NOT NULL DEFAULT 'TODO';