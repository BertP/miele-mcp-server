import { MieleClient } from '../../miele/mieleClient';

export const listDevicesTool = {
  name: 'list_devices',
  description: 'Return all consented Miele devices visible to the authenticated user.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  async handler() {
    try {
      const data = await MieleClient.get('/devices');
      // Format response according to SPEC
      const devices = Object.keys(data).map(deviceId => {
        const device = data[deviceId];
        return {
          deviceId,
          matNumber: device.ident?.deviceIdentLabel?.matNumber || 'Unknown',
          displayName: device.ident?.deviceIdentLabel?.techType || 'Miele Appliance',
          type: device.ident?.type?.value_localized || device.ident?.type?.value_raw || 'Unknown',
          online: device.state?.status?.value_raw !== 255 // Miele API uses 255 for offline typically, adjust as needed
        };
      });
      return {
        content: [{ type: 'text', text: JSON.stringify({ devices }, null, 2) }]
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Failed to list devices: ${error.message}` }]
      };
    }
  }
};
