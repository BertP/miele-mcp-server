import { MieleClient } from '../../miele/mieleClient';
import { OperationLogRepository } from '../../storage/operationLogRepository';

export const putDeviceActionTool = {
  name: 'put_device_action',
  description: 'Send an action (PUT) to a device. Requires mcs_thirdparty_write scope.',
  inputSchema: {
    type: 'object',
    properties: {
      deviceId: { 
        type: 'string', 
        description: 'The unique identifier of the appliance' 
      },
      body: { 
        type: 'object', 
        description: 'The JSON payload of the action (e.g. {"processAction": 1} to start, {"processAction": 2} to stop, {"targetTemperature": [{"zone": 1, "value": 200}]} etc.)' 
      },
      dryRun: {
        type: 'boolean',
        description: 'If true, performs a preflight check but does not send the action to the Miele API.'
      }
    },
    required: ['deviceId', 'body'],
    additionalProperties: false,
  },
  async handler(args: { deviceId: string, body: Record<string, any>, dryRun?: boolean }) {
    const actionKeys = Object.keys(args.body).join(', ');
    try {
      // Preflight check: fetch available actions
      const availableActions = await MieleClient.get(`/devices/${args.deviceId}/actions`);
      
      // Perform preflight validation
      for (const [key, value] of Object.entries(args.body)) {
        if (!availableActions || !(key in availableActions)) {
          const reason = `Preflight failed: Action '${key}' is not currently available for this device.`;
          await OperationLogRepository.log(args.deviceId, `put_device_action (${actionKeys})`, false, false, reason);
          return {
            content: [{ type: 'text', text: reason }]
          };
        }
        
        // If the API specifies allowed primitive values as an array
        if (Array.isArray(availableActions[key]) && typeof value !== 'object') {
          if (!availableActions[key].includes(value)) {
            const reason = `Preflight failed: Value '${value}' for action '${key}' is not currently permitted. Allowed values: ${JSON.stringify(availableActions[key])}`;
            await OperationLogRepository.log(args.deviceId, `put_device_action (${actionKeys})`, false, false, reason);
            return {
              content: [{ type: 'text', text: reason }]
            };
          }
        }
      }

      if (args.dryRun) {
        await OperationLogRepository.log(args.deviceId, `put_device_action (${actionKeys})`, true, false, 'dryRun');
        return {
          content: [{ type: 'text', text: 'Preflight check passed. Dry-run enabled, so no action was actually executed.' }]
        };
      }

      const response = await MieleClient.put(`/devices/${args.deviceId}/actions`, args.body);
      await OperationLogRepository.log(args.deviceId, `put_device_action (${actionKeys})`, true, true);
      
      return {
        content: [{ type: 'text', text: response ? JSON.stringify(response, null, 2) : 'Action executed successfully.' }]
      };
    } catch (error: any) {
      await OperationLogRepository.log(args.deviceId, `put_device_action (${actionKeys})`, false, false, `Error: ${error.message}`);
      return {
        isError: true,
        content: [{ type: 'text', text: `Failed to put device action: ${error.message}. Note: You may need to re-authenticate to grant the 'mcs_thirdparty_write' scope.` }]
      };
    }
  }
};

