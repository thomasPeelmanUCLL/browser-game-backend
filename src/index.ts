import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { setupGameSocket } from './ws/gameSocket';
import resourceRoutes from './routes/resources';
import hexRoutes from './routes/hexes';
import { startSpawnLoop } from './services/resourceSpawn';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());
app.use('/resources', resourceRoutes);
app.use('/hexes', hexRoutes);

setupGameSocket(wss);
startSpawnLoop();

const PORT = process.env.PORT ?? 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
