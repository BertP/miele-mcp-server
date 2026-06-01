import { MieleClient } from '../../miele/mieleClient';

export const getDeviceTool = {
  name: 'get_device',
  description: 'Return full details for a device.',
  inputSchema: {
    type: 'object',
    properties: { deviceId: { type: 'string' } },
    required: ['deviceId'],
    additionalProperties: false,
  },
  async handler(args: { deviceId: string }) {
    try {
      const data = await MieleClient.get(`/devices/${args.deviceId}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error: any) {
      return { isError: true, content: [{ type: 'text', text: `Failed to get device: ${error.message}` }] };
    }
  }
};

export const getDeviceProgramsTool = {
  name: 'get_device_programs',
  description: 'Return currently available programs for a device.',
  inputSchema: {
    type: 'object',
    properties: { deviceId: { type: 'string' } },
    required: ['deviceId'],
    additionalProperties: false,
  },
  async handler(args: { deviceId: string }) {
    try {
      const data = await MieleClient.get(`/devices/${args.deviceId}/programs`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error: any) {
      return { isError: true, content: [{ type: 'text', text: `Failed to get device programs: ${error.message}` }] };
    }
  }
};

export const getDeviceIdentTool = {
  name: 'get_device_ident',
  description: 'Return identity details for a device.',
  inputSchema: {
    type: 'object',
    properties: { deviceId: { type: 'string' } },
    required: ['deviceId'],
    additionalProperties: false,
  },
  async handler(args: { deviceId: string }) {
    try {
      const data = await MieleClient.get(`/devices/${args.deviceId}/ident`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error: any) {
      return { isError: true, content: [{ type: 'text', text: `Failed to get device ident: ${error.message}` }] };
    }
  }
};
