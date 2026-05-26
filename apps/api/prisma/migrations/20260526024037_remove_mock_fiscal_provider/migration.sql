/*
  Warnings:

  - You are about to alter the column `provider` on the `ServiceInvoice` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(7))` to `Enum(EnumId(9))`.
  - You are about to alter the column `fiscalProvider` on the `Tenant` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(12))` to `Enum(EnumId(9))`.
  - The values [MOCK] on the enum `TenantFiscalCredential_provider` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
UPDATE `ServiceInvoice` SET `provider` = 'NFE_IO' WHERE `provider` = 'MOCK';
ALTER TABLE `ServiceInvoice` MODIFY `provider` ENUM('NFE_IO') NOT NULL DEFAULT 'NFE_IO';

-- AlterTable
UPDATE `Tenant` SET `fiscalProvider` = 'NFE_IO' WHERE `fiscalProvider` = 'MOCK';
ALTER TABLE `Tenant` MODIFY `fiscalProvider` ENUM('NFE_IO') NOT NULL DEFAULT 'NFE_IO';

-- AlterTable
ALTER TABLE `TenantFiscalCredential` MODIFY `provider` ENUM('NFE_IO') NOT NULL;
