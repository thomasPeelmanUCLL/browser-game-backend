import { WebSocketServer, WebSocket } from 'ws';
import { PrismaClient } from '@prisma/client';
import { getResourcesNear } from '../services/resourceSpawn';

const prisma = new PrismaClient();

interface WSMessage {
  type: string;
  [key: string]: any;
}

export function setupGameSocket(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket) => {
    console.log('Player connected');

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
        // TODO: validate player distance from resource position
        await prisma.resource.delete({ where: { id: msg.resourceId } });
        ws.send(JSON.stringify({
          type: 'COLLECT_SUCCESS',
          resourceId: msg.resourceId,
          item: { type: resource.type, amount: resource.amount },
        }));
      }
    });

    ws.on('close', () => console.log('Player disconnected'));
  });
}
