-- CreateTable
CREATE TABLE `Tenant` (
    `id` VARCHAR(191) NOT NULL,
    `legalName` VARCHAR(191) NOT NULL,
    `tradeName` VARCHAR(191) NULL,
    `cnpj` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'ONBOARDING', 'SUSPENDED') NOT NULL DEFAULT 'ONBOARDING',
    `taxRegime` ENUM('SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL', 'MEI') NOT NULL DEFAULT 'SIMPLES_NACIONAL',
    `municipalRegistration` VARCHAR(191) NULL,
    `stateRegistration` VARCHAR(191) NULL,
    `cnae` VARCHAR(191) NULL,
    `serviceTaxCode` VARCHAR(191) NULL,
    `municipalServiceCode` VARCHAR(191) NULL,
    `fiscalProvider` ENUM('MOCK', 'NFE_IO') NOT NULL DEFAULT 'MOCK',
    `fiscalProviderCompanyId` VARCHAR(191) NULL,
    `contactEmail` VARCHAR(191) NOT NULL,
    `contactPhone` VARCHAR(191) NULL,
    `addressStreet` VARCHAR(191) NOT NULL,
    `addressNumber` VARCHAR(191) NOT NULL,
    `addressComplement` VARCHAR(191) NULL,
    `addressNeighborhood` VARCHAR(191) NOT NULL,
    `addressCity` VARCHAR(191) NOT NULL,
    `addressState` VARCHAR(191) NOT NULL,
    `addressCityIbgeCode` VARCHAR(191) NOT NULL,
    `addressZipCode` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Tenant_cnpj_key`(`cnpj`),
    INDEX `Tenant_legalName_idx`(`legalName`),
    INDEX `Tenant_status_idx`(`status`),
    INDEX `Tenant_addressCityIbgeCode_idx`(`addressCityIbgeCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TenantTitular` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'PARTNER', 'ACCOUNTANT', 'FINANCIAL_MANAGER') NOT NULL DEFAULT 'OWNER',
    `title` VARCHAR(191) NULL,
    `ownershipPercentage` DECIMAL(5, 2) NULL,
    `isLegalRepresentative` BOOLEAN NOT NULL DEFAULT false,
    `canIssueInvoices` BOOLEAN NOT NULL DEFAULT true,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TenantTitular_userId_idx`(`userId`),
    INDEX `TenantTitular_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `TenantTitular_tenantId_userId_key`(`tenantId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceInvoice` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `issuedByUserId` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'PROCESSING', 'AUTHORIZED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `provider` ENUM('MOCK', 'NFE_IO') NOT NULL DEFAULT 'MOCK',
    `providerExternalId` VARCHAR(191) NULL,
    `verificationCode` VARCHAR(191) NULL,
    `rpsNumber` VARCHAR(191) NULL,
    `serviceDescription` TEXT NOT NULL,
    `serviceCode` VARCHAR(191) NULL,
    `cnaeCode` VARCHAR(191) NULL,
    `municipalTaxCode` VARCHAR(191) NULL,
    `borrowerName` VARCHAR(191) NOT NULL,
    `borrowerDocument` VARCHAR(191) NOT NULL,
    `borrowerEmail` VARCHAR(191) NULL,
    `borrowerStreet` VARCHAR(191) NULL,
    `borrowerNumber` VARCHAR(191) NULL,
    `borrowerNeighborhood` VARCHAR(191) NULL,
    `borrowerCity` VARCHAR(191) NULL,
    `borrowerState` VARCHAR(191) NULL,
    `borrowerZipCode` VARCHAR(191) NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `deductions` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `issRate` DECIMAL(5, 4) NULL,
    `notes` TEXT NULL,
    `providerPayload` JSON NULL,
    `providerResponse` JSON NULL,
    `issuedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ServiceInvoice_tenantId_idx`(`tenantId`),
    INDEX `ServiceInvoice_status_idx`(`status`),
    INDEX `ServiceInvoice_providerExternalId_idx`(`providerExternalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TenantTitular` ADD CONSTRAINT `TenantTitular_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TenantTitular` ADD CONSTRAINT `TenantTitular_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceInvoice` ADD CONSTRAINT `ServiceInvoice_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceInvoice` ADD CONSTRAINT `ServiceInvoice_issuedByUserId_fkey` FOREIGN KEY (`issuedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
