import { MieleClient } from '../../miele/mieleClient';
import { OperationLogRepository } from '../../storage/operationLogRepository';

export const startDeviceProgramTool = {
  name: 'start_device_program',
  description: 'Start a selected program on a supported appliance. Requires mcs_thirdparty_write scope.',
  inputSchema: {
    type: 'object',
    properties: {
      deviceId: { 
        type: 'string', 
        description: 'The unique identifier of the appliance' 
      },
      programId: { 
        type: 'string', 
        description: 'The ID of the program to start' 
      },
      parameters: { 
        type: 'object', 
        description: 'Additional parameters for the program' 
      },
      dryRun: {
        type: 'boolean',
        description: 'If true, performs a preflight check but does not send the action to the Miele API.',
        default: false
      }
    },
    required: ['deviceId', 'programId'],
    additionalProperties: false,
  },
  async handler(args: { deviceId: string, programId: string, parameters?: Record<string, any>, dryRun?: boolean }) {
    try {
      // Preflight check: fetch available programs
      const availablePrograms = await MieleClient.get(`/devices/${args.deviceId}/programs`);
      
      // Perform preflight validation
      if (!availablePrograms || !Array.isArray(availablePrograms) || !availablePrograms.some((p: any) => p.programId?.toString() === args.programId.toString())) {
        const reason = `Preflight failed: Program '${args.programId}' is not currently available for this device.`;
        await OperationLogRepository.log(args.deviceId, `start_device_program (programId: ${args.programId})`, false, false, reason);
        return {
          content: [{ type: 'text', text: reason }]
        };
      }

      if (args.dryRun) {
        await OperationLogRepository.log(args.deviceId, `start_device_program (programId: ${args.programId})`, true, false, 'dryRun');
        return {
          content: [{ type: 'text', text: 'Preflight check passed. Dry-run enabled, so no program was actually started.' }]
        };
      }

      const body = { programId: parseInt(args.programId, 10), ...args.parameters };
      const response = await MieleClient.put(`/devices/${args.deviceId}/programs`, body);
      await OperationLogRepository.log(args.deviceId, `start_device_program (programId: ${args.programId})`, true, true);
      
      return {
        content: [{ type: 'text', text: response ? JSON.stringify(response, null, 2) : 'Program started successfully.' }]
      };
    } catch (error: any) {
      await OperationLogRepository.log(args.deviceId, `start_device_program (programId: ${args.programId})`, false, false, `Error: ${error.message}`);
      return {
        isError: true,
        content: [{ type: 'text', text: `Failed to start device program: ${error.message}. Note: You may need to re-authenticate to grant the 'mcs_thirdparty_write' scope.` }]
      };
    }
  }
};

