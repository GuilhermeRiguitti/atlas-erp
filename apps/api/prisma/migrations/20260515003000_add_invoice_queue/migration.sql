-- AlterTable
ALTER TABLE `ServiceInvoice`
    MODIFY `status` ENUM('DRAFT', 'QUEUED', 'PROCESSING', 'AUTHORIZED', 'REJECTED', 'FAILED_RETRYING', 'FAILED_FINAL', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN `processingAttempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `lastAttemptAt` DATETIME(3) NULL,
    ADD COLUMN `lastFailureReason` TEXT NULL,
    ADD COLUMN `queuedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `FiscalAuditEvent` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `serviceInvoiceId` VARCHAR(191) NULL,
    `actorUserId` VARCHAR(191) NULL,
    `type` ENUM('INVOICE_ISSUE_QUEUED', 'INVOICE_ISSUE_STARTED', 'INVOICE_ISSUE_PROCESSING', 'INVOICE_ISSUE_AUTHORIZED', 'INVOICE_ISSUE_REJECTED', 'INVOICE_ISSUE_FAILED', 'INVOICE_CANCELLED', 'FISCAL_CREDENTIAL_UPDATED', 'FISCAL_CREDENTIAL_DISABLED') NOT NULL,
    `message` TEXT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FiscalAuditEvent_tenantId_idx`(`tenantId`),
    INDEX `FiscalAuditEvent_serviceInvoiceId_idx`(`serviceInvoiceId`),
    INDEX `FiscalAuditEvent_actorUserId_idx`(`actorUserId`),
    INDEX `FiscalAuditEvent_type_idx`(`type`),
    INDEX `FiscalAuditEvent_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FiscalAuditEvent` ADD CONSTRAINT `FiscalAuditEvent_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FiscalAuditEvent` ADD CONSTRAINT `FiscalAuditEvent_serviceInvoiceId_fkey` FOREIGN KEY (`serviceInvoiceId`) REFERENCES `ServiceInvoice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FiscalAuditEvent` ADD CONSTRAINT `FiscalAuditEvent_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
