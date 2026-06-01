import { MieleClient } from '../../miele/mieleClient';

export const getDeviceStateTool = {
  name: 'get_device_state',
  description: 'Return current state of a device.',
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
      const state = await MieleClient.get(`/devices/${args.deviceId}/state`);
      
      const response = {
        deviceId: args.deviceId,
        status: state.status?.value_localized || 'Unknown',
        program: state.programType?.value_localized || 'Unknown',
        remainingTime: state.remainingTime ? `${state.remainingTime[0]}h ${state.remainingTime[1]}m` : 'N/A',
        raw: state
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(response, null, 2) }]
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Failed to get device state: ${error.message}` }]
      };
    }
  }
};
