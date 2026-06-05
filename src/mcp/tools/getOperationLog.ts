import { OperationLogRepository } from '../../storage/operationLogRepository';

export const getOperationLogTool = {
  name: 'get_operation_log',
  description: 'Retrieve the most recent write operations (put_device_action, start_device_program) and their preflight results. Useful for auditing what actions have been executed or blocked.',
  inputSchema: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Maximum number of log entries to return (default: 20, max: 100).',
        default: 20,
      }
    },
    additionalProperties: false,
  },
  async handler(args: { limit?: number }) {
    try {
      const limit = Math.min(args.limit ?? 20, 100);
      const entries = await OperationLogRepository.getRecentLogs(limit);

      if (entries.length === 0) {
        return {
          content: [{ type: 'text', text: 'No operation log entries found.' }]
        };
      }

      const formatted = entries.map(e => ({
        id: e.id,
        timestamp: new Date(e.created_at * 1000).toISOString(),
        deviceId: e.device_id,
        operation: e.operation,
        preflightPassed: e.allowed,
        executed: e.executed,
        reason: e.reason ?? null,
      }));

      return {
        content: [{ type: 'text', text: JSON.stringify({ count: entries.length, entries: formatted }, null, 2) }]
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Failed to retrieve operation log: ${error.message}` }]
      };
    }
  }
};
