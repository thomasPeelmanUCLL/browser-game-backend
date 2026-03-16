import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

const RESOURCE_TYPES = ['wood', 'stone', 'food', 'water', 'rare'] as const;
type ResourceType = typeof RESOURCE_TYPES[number];

function randomOffset(meters: number): number {
  // ~111,000 meters per degree latitude
  return (Math.random() - 0.5) * (meters / 55_000);
}

export async function getResourcesNear(lat: number, lng: number, radiusMeters: number) {
  // Raw PostGIS query: find resources within radius
  const resources = await prisma.$queryRaw`
    SELECT id, type, amount, ST_Y(position::geometry) AS lat, ST_X(position::geometry) AS lng
    FROM "Resource"
    WHERE ST_DWithin(
      position,
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
      ${radiusMeters}
    )
  `;
  return resources;
}

export async function spawnResourcesNear(lat: number, lng: number, count = 5) {
  const spawns = Array.from({ length: count }).map(() => ({
    id: uuidv4(),
    type: RESOURCE_TYPES[Math.floor(Math.random() * RESOURCE_TYPES.length)] as ResourceType,
    amount: Math.floor(Math.random() * 5) + 1,
    // Store as WKT for PostGIS
    lat: lat + randomOffset(200),
    lng: lng + randomOffset(200),
  }));

  for (const s of spawns) {
    await prisma.$executeRaw`
      INSERT INTO "Resource" (id, type, amount, position)
      VALUES (
        ${s.id},
        ${s.type},
        ${s.amount},
        ST_SetSRID(ST_MakePoint(${s.lng}, ${s.lat}), 4326)::geography
      )
    `;
  }
}

export function startSpawnLoop() {
  // Spawn resources at a fixed location for testing; replace with player positions in prod
  const TEST_LAT = 50.8503; // Brussels
  const TEST_LNG = 4.3517;

  spawnResourcesNear(TEST_LAT, TEST_LNG);
  setInterval(() => spawnResourcesNear(TEST_LAT, TEST_LNG, 3), 60_000); // every 60s
  console.log('Resource spawn loop started');
}
