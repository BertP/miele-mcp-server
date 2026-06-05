import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import packageJson from '../../package.json';

import { listDevicesTool } from './tools/listDevices';
import { getDeviceStateTool } from './tools/getDeviceState';
import { getDeviceActionsTool } from './tools/getDeviceActions';
import { getDeviceTool, getDeviceProgramsTool, getDeviceIdentTool, getAllFillingLevelsTool, getDeviceFillingLevelsTool, getFailureDetailsTool } from './tools/otherReadTools';
import { getDeviceCameraTool } from './tools/getDeviceCamera';
import { putDeviceActionTool } from './tools/putDeviceAction';
import { startDeviceProgramTool } from './tools/startDeviceProgram';
import { getOperationLogTool } from './tools/getOperationLog';

export function createMcpServer(): Server {
  const server = new Server(
    {
      name: packageJson.name,
      version: packageJson.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const tools = [
    listDevicesTool,
    getDeviceStateTool,
    getDeviceActionsTool,
    getDeviceTool,
    getDeviceProgramsTool,
    getDeviceIdentTool,
    getAllFillingLevelsTool,
    getDeviceFillingLevelsTool,
    getFailureDetailsTool,
    getDeviceCameraTool,
    putDeviceActionTool,
    startDeviceProgramTool,
    getOperationLogTool,
  ];

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find(t => t.name === request.params.name);
    if (!tool) {
      throw new Error(`Tool not found: ${request.params.name}`);
    }
    
    return await tool.handler(request.params.arguments as any);
  });

  return server;
}

export async function runServer() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Miele MCP Server running on stdio');
}

// If this file is executed directly, start the server
if (require.main === module) {
  runServer().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
  });
}
