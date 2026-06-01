import { MieleClient } from '../../miele/mieleClient';

export const getDeviceActionsTool = {
  name: 'get_device_actions',
  description: 'Return currently available actions for a device.',
  inputSchema: {
    type: 'object',
    properties: {
      deviceId: { type: 'string' }
    },
    required: ['deviceId'],
    additionalProperties: false,
  },
  async handler(args: { deviceId: string }) {
    try {
      const actions = await MieleClient.get(`/devices/${args.deviceId}/actions`);
      
      return {
        content: [{ type: 'text', text: JSON.stringify(actions, null, 2) }]
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Failed to get device actions: ${error.message}` }]
      };
    }
  }
};
