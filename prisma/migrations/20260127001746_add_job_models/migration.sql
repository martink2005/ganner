-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_items" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "cabinet_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "depth" DOUBLE PRECISION,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "output_status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_item_parameter_values" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "param_name" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "job_item_parameter_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_items_job_id_name_key" ON "job_items"("job_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "job_item_parameter_values_item_id_param_name_key" ON "job_item_parameter_values"("item_id", "param_name");

-- AddForeignKey
ALTER TABLE "job_items" ADD CONSTRAINT "job_items_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_items" ADD CONSTRAINT "job_items_cabinet_id_fkey" FOREIGN KEY ("cabinet_id") REFERENCES "cabinets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_item_parameter_values" ADD CONSTRAINT "job_item_parameter_values_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "job_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
