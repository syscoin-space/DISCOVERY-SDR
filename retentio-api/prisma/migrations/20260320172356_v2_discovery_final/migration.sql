-- CreateEnum
CREATE TYPE "DiscoveryStatus" AS ENUM ('SEARCHING_DM', 'DM_IDENTIFIED', 'DM_REACHED', 'GATEKEEPER_BLOCKED', 'READY_FOR_PROSPECTING', 'INSUFFICIENT_DATA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TouchpointOutcome" ADD VALUE 'GATEKEEPER_CONTACTED';
ALTER TYPE "TouchpointOutcome" ADD VALUE 'DECISION_MAKER_IDENTIFIED';
ALTER TYPE "TouchpointOutcome" ADD VALUE 'TRANSFERRED_TO_DM';
ALTER TYPE "TouchpointOutcome" ADD VALUE 'DIRECT_CONTACT_FOUND';
ALTER TYPE "TouchpointOutcome" ADD VALUE 'COMPANY_UNREACHABLE';
ALTER TYPE "TouchpointOutcome" ADD VALUE 'WRONG_CONTACT';
ALTER TYPE "TouchpointOutcome" ADD VALUE 'DISCOVERY_COMPLETED';

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "direct_email" TEXT,
ADD COLUMN     "direct_phone" TEXT,
ADD COLUMN     "discovery_notes" TEXT,
ADD COLUMN     "discovery_status" "DiscoveryStatus" NOT NULL DEFAULT 'SEARCHING_DM',
ADD COLUMN     "dm_name" TEXT,
ADD COLUMN     "dm_role" TEXT,
ADD COLUMN     "last_touchpoint_id" TEXT,
ADD COLUMN     "operational_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "preferred_channel" TEXT;
