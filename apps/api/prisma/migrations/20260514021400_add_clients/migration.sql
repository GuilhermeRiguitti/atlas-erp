-- AlterTable
ALTER TABLE `ServiceInvoice` ADD COLUMN `clientId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Client` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `type` ENUM('INDIVIDUAL', 'COMPANY') NOT NULL DEFAULT 'COMPANY',
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `name` VARCHAR(191) NOT NULL,
    `tradeName` VARCHAR(191) NULL,
    `document` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `municipalRegistration` VARCHAR(191) NULL,
    `stateRegistration` VARCHAR(191) NULL,
    `addressStreet` VARCHAR(191) NULL,
    `addressNumber` VARCHAR(191) NULL,
    `addressComplement` VARCHAR(191) NULL,
    `addressNeighborhood` VARCHAR(191) NULL,
    `addressCity` VARCHAR(191) NULL,
    `addressState` VARCHAR(191) NULL,
    `addressZipCode` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Client_tenantId_idx`(`tenantId`),
    INDEX `Client_createdByUserId_idx`(`createdByUserId`),
    INDEX `Client_name_idx`(`name`),
    INDEX `Client_status_idx`(`status`),
    UNIQUE INDEX `Client_tenantId_document_key`(`tenantId`, `document`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ServiceInvoice_clientId_idx` ON `ServiceInvoice`(`clientId`);

-- AddForeignKey
ALTER TABLE `Client` ADD CONSTRAINT `Client_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Client` ADD CONSTRAINT `Client_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceInvoice` ADD CONSTRAINT `ServiceInvoice_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
