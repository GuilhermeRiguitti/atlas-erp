-- Adiciona o provider NFSE_NACIONAL (Sistema Nacional NFS-e, Receita Federal)
-- ao enum FiscalProvider, usado em tres colunas.

-- AlterTable
ALTER TABLE `ServiceInvoice` MODIFY `provider` ENUM('NFE_IO', 'NFSE_NACIONAL') NOT NULL DEFAULT 'NFE_IO';

-- AlterTable
ALTER TABLE `Tenant` MODIFY `fiscalProvider` ENUM('NFE_IO', 'NFSE_NACIONAL') NOT NULL DEFAULT 'NFE_IO';

-- AlterTable
ALTER TABLE `TenantFiscalCredential` MODIFY `provider` ENUM('NFE_IO', 'NFSE_NACIONAL') NOT NULL;
