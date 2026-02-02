-- AlterTable
ALTER TABLE "cabinet_files" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "job_item_file_quantities" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "job_item_file_quantities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_item_file_quantities_item_id_idx" ON "job_item_file_quantities"("item_id");

-- CreateIndex
CREATE INDEX "job_item_file_quantities_file_id_idx" ON "job_item_file_quantities"("file_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_item_file_quantities_item_id_file_id_key" ON "job_item_file_quantities"("item_id", "file_id");

-- AddForeignKey
ALTER TABLE "job_item_file_quantities" ADD CONSTRAINT "job_item_file_quantities_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "job_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_item_file_quantities" ADD CONSTRAINT "job_item_file_quantities_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "cabinet_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
