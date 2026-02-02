-- AlterTable
ALTER TABLE "cabinet_parameters" ADD COLUMN     "group_id" TEXT;

-- CreateTable
CREATE TABLE "cabinet_parameter_groups" (
    "id" TEXT NOT NULL,
    "cabinet_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "cabinet_parameter_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cabinet_parameter_groups_cabinet_id_idx" ON "cabinet_parameter_groups"("cabinet_id");

-- CreateIndex
CREATE INDEX "cabinet_parameters_group_id_idx" ON "cabinet_parameters"("group_id");

-- AddForeignKey
ALTER TABLE "cabinet_parameter_groups" ADD CONSTRAINT "cabinet_parameter_groups_cabinet_id_fkey" FOREIGN KEY ("cabinet_id") REFERENCES "cabinets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabinet_parameters" ADD CONSTRAINT "cabinet_parameters_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "cabinet_parameter_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
