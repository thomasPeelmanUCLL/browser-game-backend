import { Router } from 'express';
import { getAllClaimedHexes, getHexesNear } from '../services/hexService';

const router = Router();

// GET /hexes - all claimed hexes (used on initial load)
router.get('/', async (_req, res) => {
  const hexes = await getAllClaimedHexes();
  res.json(hexes);
});

// GET /hexes/near?lat=&lng=
router.get('/near', async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: 'lat and lng required' });
    return;
  }

  const hexes = await getHexesNear(lat, lng);
  res.json(hexes);
});

export default router;
