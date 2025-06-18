import express, { Request, Response } from 'express';
import cors from 'cors';
import { Client } from '@googlemaps/google-maps-services-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const googleMapsClient = new Client({});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Calculate shortest path endpoint
app.post('/calculate-route', async (req: Request, res: Response) => {
  try {
    const { addresses } = req.body;

    if (!addresses || !Array.isArray(addresses) || addresses.length < 2) {
      res.status(400).json({ error: 'Please provide at least 2 addresses' });
      return;
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'Google Maps API key not configured' });
      return;
    }

    // Get distance matrix for all address combinations
    const response = await googleMapsClient.distancematrix({
      params: {
        origins: addresses,
        destinations: addresses,
        key: apiKey,
      },
    });

    // Extract distances from the response
    const distances = response.data.rows.map((row) =>
      row.elements.map((element) => element.distance?.value || Infinity)
    );

    // Find the shortest path using a simple algorithm
    // This is a basic implementation - you might want to use a more sophisticated algorithm
    const path = findShortestPath(distances);

    // Format the response
    const route = path.map((index) => addresses[index]);
    const totalDistance = calculateTotalDistance(distances, path);

    res.json({
      route,
      totalDistance: `${(totalDistance / 1000).toFixed(2)} km`,
      addresses: route,
    });
  } catch (error) {
    console.error('Error calculating route:', error);
    res.status(500).json({ error: 'Failed to calculate route' });
  }
});

// Helper function to find the shortest path
function findShortestPath(distances: number[][]): number[] {
  const n = distances.length;
  const path: number[] = [0]; // Start with the first address
  const visited = new Set([0]);

  while (visited.size < n) {
    let minDistance = Infinity;
    let nextIndex = -1;

    for (let i = 0; i < n; i++) {
      if (!visited.has(i)) {
        const lastIndex = path[path.length - 1];
        const distance = distances[lastIndex][i];
        if (distance < minDistance) {
          minDistance = distance;
          nextIndex = i;
        }
      }
    }

    if (nextIndex !== -1) {
      path.push(nextIndex);
      visited.add(nextIndex);
    }
  }

  return path;
}

// Helper function to calculate total distance
function calculateTotalDistance(distances: number[][], path: number[]): number {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    total += distances[path[i]][path[i + 1]];
  }
  return total;
}

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
