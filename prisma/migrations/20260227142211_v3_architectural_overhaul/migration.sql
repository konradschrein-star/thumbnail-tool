-- AlterTable
ALTER TABLE "channels" ADD COLUMN "logoAssetPath" TEXT;
ALTER TABLE "channels" ADD COLUMN "personaAssetPath" TEXT;
ALTER TABLE "channels" ADD COLUMN "primaryColor" TEXT DEFAULT '#ffffff';
ALTER TABLE "channels" ADD COLUMN "secondaryColor" TEXT DEFAULT '#000000';
ALTER TABLE "channels" ADD COLUMN "tags" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_archetypes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "channelId" TEXT,
    "imageUrl" TEXT NOT NULL,
    "layoutInstructions" TEXT NOT NULL,
    "category" TEXT DEFAULT 'General',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "archetypes_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_archetypes" ("channelId", "createdAt", "id", "imageUrl", "layoutInstructions", "name", "updatedAt") SELECT "channelId", "createdAt", "id", "imageUrl", "layoutInstructions", "name", "updatedAt" FROM "archetypes";
DROP TABLE "archetypes";
ALTER TABLE "new_archetypes" RENAME TO "archetypes";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
