-- CreateTable
CREATE TABLE "cabinet_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cabinet_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cabinets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category_id" TEXT,
    "base_width" DOUBLE PRECISION,
    "base_height" DOUBLE PRECISION,
    "base_depth" DOUBLE PRECISION,
    "catalog_path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cabinets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cabinet_files" (
    "id" TEXT NOT NULL,
    "cabinet_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "relative_path" TEXT NOT NULL,
    "hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cabinet_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cabinet_parameters" (
    "id" TEXT NOT NULL,
    "cabinet_id" TEXT NOT NULL,
    "param_name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "param_type" TEXT NOT NULL DEFAULT 'number',
    "unit" TEXT,
    "default_value" TEXT,
    "sort_id" INTEGER,

    CONSTRAINT "cabinet_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cabinet_parameter_usages" (
    "id" TEXT NOT NULL,
    "parameter_id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "xml_path" TEXT NOT NULL,

    CONSTRAINT "cabinet_parameter_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cabinet_categories_slug_key" ON "cabinet_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "cabinets_slug_key" ON "cabinets"("slug");

-- CreateIndex
CREATE INDEX "cabinet_files_cabinet_id_idx" ON "cabinet_files"("cabinet_id");

-- CreateIndex
CREATE INDEX "cabinet_parameters_cabinet_id_idx" ON "cabinet_parameters"("cabinet_id");

-- CreateIndex
CREATE UNIQUE INDEX "cabinet_parameters_cabinet_id_param_name_key" ON "cabinet_parameters"("cabinet_id", "param_name");

-- CreateIndex
CREATE INDEX "cabinet_parameter_usages_parameter_id_idx" ON "cabinet_parameter_usages"("parameter_id");

-- CreateIndex
CREATE INDEX "cabinet_parameter_usages_file_id_idx" ON "cabinet_parameter_usages"("file_id");

-- AddForeignKey
ALTER TABLE "cabinet_categories" ADD CONSTRAINT "cabinet_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "cabinet_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabinets" ADD CONSTRAINT "cabinets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "cabinet_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabinet_files" ADD CONSTRAINT "cabinet_files_cabinet_id_fkey" FOREIGN KEY ("cabinet_id") REFERENCES "cabinets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabinet_parameters" ADD CONSTRAINT "cabinet_parameters_cabinet_id_fkey" FOREIGN KEY ("cabinet_id") REFERENCES "cabinets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabinet_parameter_usages" ADD CONSTRAINT "cabinet_parameter_usages_parameter_id_fkey" FOREIGN KEY ("parameter_id") REFERENCES "cabinet_parameters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabinet_parameter_usages" ADD CONSTRAINT "cabinet_parameter_usages_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "cabinet_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
