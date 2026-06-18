-- Remove vestigios da fase portfolio/single-tenant.
-- UserRole: remove RECRUITER (papel sem sentido para ERP fiscal).
-- UserProfile: troca o perfil de portfolio (CV) por um perfil de operador de ERP.

-- AlterEnum UserRole (remapeia RECRUITER -> MEMBER antes de remover o valor)
UPDATE `User` SET `role` = 'MEMBER' WHERE `role` = 'RECRUITER';
ALTER TABLE `User` MODIFY `role` ENUM('ADMIN', 'MEMBER') NOT NULL DEFAULT 'MEMBER';

-- AlterTable UserProfile: remove campos de portfolio
ALTER TABLE `UserProfile`
  DROP COLUMN `headline`,
  DROP COLUMN `bio`,
  DROP COLUMN `location`,
  DROP COLUMN `seniority`,
  DROP COLUMN `skills`,
  DROP COLUMN `availability`,
  DROP COLUMN `website`,
  DROP COLUMN `github`,
  DROP COLUMN `linkedin`;

-- AlterTable UserProfile: adiciona campos de operador de ERP (todos opcionais)
ALTER TABLE `UserProfile`
  ADD COLUMN `phone` VARCHAR(191) NULL,
  ADD COLUMN `jobTitle` VARCHAR(191) NULL,
  ADD COLUMN `department` VARCHAR(191) NULL,
  ADD COLUMN `avatarUrl` VARCHAR(191) NULL,
  ADD COLUMN `locale` VARCHAR(191) NULL,
  ADD COLUMN `timezone` VARCHAR(191) NULL;
