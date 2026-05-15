-- CreateTable
CREATE TABLE `TenantFiscalCredential` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `provider` ENUM('MOCK', 'NFE_IO') NOT NULL,
    `status` ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    `providerCompanyId` VARCHAR(191) NOT NULL,
    `encryptedApiKey` TEXT NOT NULL,
    `apiKeyLast4` VARCHAR(191) NULL,
    `encryptedCertificatePassword` TEXT NULL,
    `encryptedCertificatePfx` LONGTEXT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TenantFiscalCredential_tenantId_provider_key`(`tenantId`, `provider`),
    INDEX `TenantFiscalCredential_tenantId_idx`(`tenantId`),
    INDEX `TenantFiscalCredential_provider_idx`(`provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TenantFiscalCredential` ADD CONSTRAINT `TenantFiscalCredential_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
