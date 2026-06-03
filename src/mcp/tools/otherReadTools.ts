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

export const getAllFillingLevelsTool = {
  name: 'get_all_filling_levels',
  description: 'Return filling levels for all supported appliances.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  async handler() {
    try {
      const data = await MieleClient.get('/devices/fillingLevels');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error: any) {
      return { isError: true, content: [{ type: 'text', text: `Failed to get filling levels: ${error.message}` }] };
    }
  }
};

export const getDeviceFillingLevelsTool = {
  name: 'get_device_filling_levels',
  description: 'Return filling levels for a specific device.',
  inputSchema: {
    type: 'object',
    properties: { deviceId: { type: 'string' } },
    required: ['deviceId'],
    additionalProperties: false,
  },
  async handler(args: { deviceId: string }) {
    try {
      const data = await MieleClient.get(`/devices/${args.deviceId}/fillingLevels`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error: any) {
      return { isError: true, content: [{ type: 'text', text: `Failed to get device filling levels: ${error.message}` }] };
    }
  }
};

export const getFailureDetailsTool = {
  name: 'get_failure_details',
  description: 'Return known failure details for a device.',
  inputSchema: {
    type: 'object',
    properties: { deviceId: { type: 'string' } },
    required: ['deviceId'],
    additionalProperties: false,
  },
  async handler(args: { deviceId: string }) {
    try {
      const data = await MieleClient.get(`/devices/${args.deviceId}/failureDetails`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error: any) {
      return { isError: true, content: [{ type: 'text', text: `Failed to get failure details: ${error.message}` }] };
    }
  }
};
