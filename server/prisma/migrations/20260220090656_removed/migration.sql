/*
  Warnings:

  - You are about to drop the `TaskEvent` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TaskEvent" DROP CONSTRAINT "TaskEvent_taskId_fkey";

-- DropTable
DROP TABLE "TaskEvent";
