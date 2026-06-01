import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { config } from '../src/config';

async function runDemo() {
  console.log('🤖 Starting Miele MCP Server Demo Client...\n');

  console.log(`🔑 Step 1: Ensure you are logged in.`);
  console.log(`Please visit the following URL to authenticate if you haven't already:`);
  console.log(`http://localhost:${config.PORT}/auth/login`);
  console.log(`(Or use your reverse proxy: https://mielemcp.never2sunny.eu/auth/login)`);
  console.log('\nWait for authentication to complete, then press Enter to continue...');
  
  await new Promise(resolve => process.stdin.once('data', resolve));
  
  console.log('\n🔌 Step 2: Connecting to the MCP Server via Stdio...');
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', 'src/mcp/server.ts'],
  });

  const client = new Client(
    { name: 'miele-demo-client', version: '1.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log('✅ Connected to MCP Server successfully.\n');

  console.log('📋 Step 3: Fetching available tools...');
  const toolsResponse = await client.listTools();
  const toolNames = toolsResponse.tools.map(t => t.name).join(', ');
  console.log(`Tools available: ${toolNames}\n`);

  console.log('📡 Step 4: Calling `list_devices` tool...');
  const devicesResult = await client.callTool({
    name: 'list_devices',
    arguments: {}
  });
  
  console.log('Result:');
  console.dir(devicesResult, { depth: null });
  
  // Try to parse devices to get a deviceId
  let deviceId: string | null = null;
  try {
    const textContent = (devicesResult.content as any[])[0].text;
    const data = JSON.parse(textContent);
    if (data.devices && data.devices.length > 0) {
      deviceId = data.devices[0].deviceId;
    }
  } catch (e) {
    // Ignore parse errors, deviceId stays null
  }

  if (deviceId) {
    console.log(`\n🔍 Found device: ${deviceId}. Fetching device state...`);
    const stateResult = await client.callTool({
      name: 'get_device_state',
      arguments: { deviceId }
    });
    console.log('State Result:');
    console.dir(stateResult, { depth: null });

    console.log(`\n⚙️ Fetching available actions for ${deviceId}...`);
    const actionsResult = await client.callTool({
      name: 'get_device_actions',
      arguments: { deviceId }
    });
    console.log('Actions Result:');
    console.dir(actionsResult, { depth: null });

    // Error demo - invalid device ID
    console.log('\n🚨 Step 5: Testing error scenario (invalid device ID)...');
    const errorResult = await client.callTool({
      name: 'get_device_state',
      arguments: { deviceId: 'invalid-device-id-123' }
    });
    console.log('Error Result:');
    console.dir(errorResult, { depth: null });

  } else {
    console.log('\n⚠️ No devices found or failed to parse device ID. Skipping state checks.');
    console.log('Make sure you have authenticated and your Miele account has appliances attached.');
  }

  console.log('\n🎉 Demo complete! Shutting down...');
  process.exit(0);
}

runDemo().catch(error => {
  console.error('Demo failed:', error);
  process.exit(1);
});
