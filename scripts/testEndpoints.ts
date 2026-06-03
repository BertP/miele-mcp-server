import { MieleClient } from '../src/miele/mieleClient';
import { config } from '../src/config';

async function testEndpoints() {
  try {
    console.log('Fetching all filling levels...');
    const allFillingLevels = await MieleClient.get('/devices/fillingLevels');
    console.log(JSON.stringify(allFillingLevels, null, 2));

    console.log('\nFetching devices to get a deviceId...');
    const devicesResponse = await MieleClient.get('/devices');
    const devices = Object.keys(devicesResponse || {});
    
    if (devices.length > 0) {
      const deviceId = devices[0];
      console.log(`\nFetching filling levels for device ${deviceId}...`);
      const singleFillingLevel = await MieleClient.get(`/devices/${deviceId}/fillingLevels`);
      console.log(JSON.stringify(singleFillingLevel, null, 2));

      console.log(`\nFetching failure details for device ${deviceId}...`);
      const failureDetails = await MieleClient.get(`/devices/${deviceId}/failureDetails`);
      console.log(JSON.stringify(failureDetails, null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

testEndpoints();
