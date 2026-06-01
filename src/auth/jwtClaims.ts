export interface JwtPayload {
  sub?: string;
  exp?: number;
  iat?: number;
  scopes?: string[];
  [key: string]: any;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const payloadBuffer = Buffer.from(parts[1], 'base64');
    return JSON.parse(payloadBuffer.toString('utf-8'));
  } catch (error) {
    console.error('Failed to decode JWT payload:', error);
    return null;
  }
}

export function extractPermittedDevices(token: string): string[] {
  const payload = decodeJwtPayload(token);
  if (!payload) return [];

  // Miele might store devices in a specific claim, e.g., 'devices' or 'miele_devices'.
  // We'll look for an array of strings.
  if (Array.isArray(payload.devices)) {
    return payload.devices;
  }
  
  // As a fallback, if we don't know the exact claim yet, we can return empty array or all (if MVP assumes consent handles it).
  // The mission says: "extract permitted appliance serial numbers where available".
  return [];
}
