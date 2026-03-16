import { PrismaClient } from '@prisma/client';
import * as h3 from 'h3-js';

const prisma = new PrismaClient();

const HEX_RESOLUTION = 9;

export async function claimHex(hexId: string, playerId: string): Promise<{ success: boolean; reason?: string; hex?: any }> {
  const existing = await prisma.hexCell.findUnique({ where: { hexId } });

  if (existing?.ownerId === playerId) {
    return { success: false, reason: 'You already own this hex' };
  }

  if (existing?.ownerId && existing.ownerId !== playerId) {
    return { success: false, reason: 'This hex is already claimed by another player' };
  }

  const hex = await prisma.hexCell.upsert({
    where: { hexId },
    update: { ownerId: playerId, claimedAt: new Date(), level: 1, bonusMultiplier: 1.0 },
    create: { hexId, ownerId: playerId, level: 1, bonusMultiplier: 1.0 },
  });

  return { success: true, hex };
}

export async function upgradeHex(hexId: string, playerId: string): Promise<{ success: boolean; reason?: string; hex?: any }> {
  const hex = await prisma.hexCell.findUnique({ where: { hexId } });

  if (!hex || hex.ownerId !== playerId) {
    return { success: false, reason: 'You do not own this hex' };
  }

  if (hex.level >= 5) {
    return { success: false, reason: 'Hex is already at max level' };
  }

  const newLevel = hex.level + 1;
  const updated = await prisma.hexCell.update({
    where: { hexId },
    data: { level: newLevel, bonusMultiplier: 1.0 + newLevel * 0.25 }, // +25% per level
  });

  return { success: true, hex: updated };
}

export async function getAllClaimedHexes() {
  return prisma.hexCell.findMany({
    include: { owner: { select: { id: true, username: true } } },
  });
}

export async function getHexesNear(lat: number, lng: number, ringSize = 12) {
  const centerHex = h3.latLngToCell(lat, lng, HEX_RESOLUTION);
  const nearbyHexIds = h3.gridDisk(centerHex, ringSize);

  return prisma.hexCell.findMany({
    where: { hexId: { in: nearbyHexIds } },
    include: { owner: { select: { id: true, username: true } } },
  });
}
