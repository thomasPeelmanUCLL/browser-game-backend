import { WebSocketServer, WebSocket } from 'ws';
import { PrismaClient } from '@prisma/client';
import { getResourcesNear } from '../services/resourceSpawn';
import { claimHex, upgradeHex, getAllClaimedHexes } from '../services/hexService';

const prisma = new PrismaClient();

// Track all connected clients for broadcasting
const clients = new Set<WebSocket>();

function broadcast(msg: object, exclude?: WebSocket) {
  const data = JSON.stringify(msg);
  clients.forEach((client) => {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

interface WSMessage {
  type: string;
  [key: string]: any;
}

export function setupGameSocket(wss: WebSocketServer) {
  wss.on('connection', async (ws: WebSocket) => {
    clients.add(ws);
    console.log(`Player connected (${clients.size} online)`);

    // Send current hex ownership state on connect
    const claimedHexes = await getAllClaimedHexes();
    ws.send(JSON.stringify({ type: 'HEXES_UPDATE', hexes: claimedHexes }));

    ws.on('message', async (data) => {
      const msg: WSMessage = JSON.parse(data.toString());

      if (msg.type === 'PLAYER_MOVE') {
        const { lat, lng } = msg.position;
        const resources = await getResourcesNear(lat, lng, Number(process.env.SPAWN_RADIUS_METERS ?? 300));
        ws.send(JSON.stringify({ type: 'RESOURCES_UPDATE', resources }));
      }

      if (msg.type === 'COLLECT_RESOURCE') {
        const resource = await prisma.resource.findUnique({ where: { id: msg.resourceId } });
        if (!resource) {
          ws.send(JSON.stringify({ type: 'COLLECT_FAIL', reason: 'Resource not found' }));
          return;
        }
        await prisma.resource.delete({ where: { id: msg.resourceId } });
        ws.send(JSON.stringify({
          type: 'COLLECT_SUCCESS',
          resourceId: msg.resourceId,
          item: { type: resource.type, amount: resource.amount },
        }));
      }

      if (msg.type === 'CLAIM_HEX') {
        const result = await claimHex(msg.hexId, msg.playerId);
        ws.send(JSON.stringify({ type: 'CLAIM_HEX_RESULT', ...result }));

        if (result.success) {
          // Broadcast updated hex to all players
          broadcast({ type: 'HEX_CLAIMED', hex: result.hex }, ws);
        }
      }

      if (msg.type === 'UPGRADE_HEX') {
        const result = await upgradeHex(msg.hexId, msg.playerId);
        ws.send(JSON.stringify({ type: 'UPGRADE_HEX_RESULT', ...result }));

        if (result.success) {
          broadcast({ type: 'HEX_UPGRADED', hex: result.hex }, ws);
        }
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`Player disconnected (${clients.size} online)`);
    });
  });
}
