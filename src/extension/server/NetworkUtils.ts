import { networkInterfaces } from 'os';

/**
 * Get the local network IP address (not localhost)
 * Returns the first non-internal IPv4 address found
 */
export function getLocalNetworkIP(): string | null {
  const interfaces = networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    const nets = interfaces[name];
    if (!nets) continue;

    for (const net of nets) {
      // Skip internal (loopback) and non-IPv4 addresses
      // Handle both string ('IPv4') and number (4) family values
      const isIPv4 = net.family === 'IPv4' || net.family === 4;
      if (isIPv4 && !net.internal) {
        return net.address;
      }
    }
  }

  return null;
}

/**
 * Format connection URLs for display
 */
export function formatConnectionUrls(
  port: number,
  localIP?: string | null
): { wsUrl: string; httpUrl: string; wsLocalUrl: string; httpLocalUrl: string } {
  const httpLocalUrl = `http://localhost:${port}`;
  const wsLocalUrl = `ws://localhost:${port}`;

  if (localIP) {
    const httpUrl = `http://${localIP}:${port}`;
    const wsUrl = `ws://${localIP}:${port}`;
    return { wsUrl, httpUrl, wsLocalUrl, httpLocalUrl };
  }

  return {
    wsUrl: wsLocalUrl,
    httpUrl: httpLocalUrl,
    wsLocalUrl,
    httpLocalUrl,
  };
}

