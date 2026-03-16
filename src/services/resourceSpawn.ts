import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as h3 from 'h3-js';

const prisma = new PrismaClient();

const RESOURCE_TYPES = ['wood', 'stone', 'food', 'water', 'rare'] as const;
type ResourceType = typeof RESOURCE_TYPES[number];

const HEX_RESOLUTION = 9;

function randomOffset(meters: number): number {
  return (Math.random() - 0.5) * (meters / 55_000);
}

export async function getResourcesNear(lat: number, lng: number, radiusMeters: number) {
  // Get H3 hex at player position and fill a k-ring for radius coverage
  const centerHex = h3.latLngToCell(lat, lng, HEX_RESOLUTION);
  // k=2 covers ~5 rings at res 9 (~1km radius)
  const kRings = h3.gridDisk(centerHex, 2);

  const resources = await prisma.$queryRaw`
    SELECT id, type, amount, hex_id,
           ST_Y(position::geometry) AS lat,
           ST_X(position::geometry) AS lng
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
  const spawns = Array.from({ length: count }).map(() => {
    const spawnLat = lat + randomOffset(200);
    const spawnLng = lng + randomOffset(200);
    const hexId = h3.latLngToCell(spawnLat, spawnLng, HEX_RESOLUTION);

    return {
      id: uuidv4(),
      type: RESOURCE_TYPES[Math.floor(Math.random() * RESOURCE_TYPES.length)] as ResourceType,
      amount: Math.floor(Math.random() * 5) + 1,
      lat: spawnLat,
      lng: spawnLng,
      hexId,
    };
  });

  for (const s of spawns) {
    await prisma.$executeRaw`
      INSERT INTO "Resource" (id, type, amount, hex_id, position)
      VALUES (
        ${s.id},
        ${s.type},
        ${s.amount},
        ${s.hexId},
        ST_SetSRID(ST_MakePoint(${s.lng}, ${s.lat}), 4326)::geography
      )
      ON CONFLICT DO NOTHING
    `;
  }
}

export function startSpawnLoop() {
  const TEST_LAT = 50.8503; // Brussels
  const TEST_LNG = 4.3517;

  spawnResourcesNear(TEST_LAT, TEST_LNG);
  setInterval(() => spawnResourcesNear(TEST_LAT, TEST_LNG, 3), 60_000);
  console.log('Resource spawn loop started');
}
