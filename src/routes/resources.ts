import { Router } from 'express';
import { getResourcesNear } from '../services/resourceSpawn';

const router = Router();

// GET /resources?lat=50.85&lng=4.35&radius=300
router.get('/', async (req, res) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radius = parseFloat(req.query.radius as string) || 300;

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: 'lat and lng are required' });
    return;
  }

  const resources = await getResourcesNear(lat, lng, radius);
  res.json(resources);
});

export default router;
