import { z } from 'zod';
import { MieleClient } from '../../miele/mieleClient';

export const getDeviceCameraTool = {
  name: 'get_device_camera',
  description: 'Retrieve the latest camera image from a supported appliance (e.g. oven camera). Requires mcs_thirdparty_media OAuth scope.',
  inputSchema: {
    type: 'object',
    properties: {
      deviceId: {
        type: 'string',
        description: 'The unique identifier of the appliance (e.g., from list_devices)',
      },
    },
    required: ['deviceId'],
    additionalProperties: false,
  },
  async handler(args: { deviceId: string }) {
    try {
      // Endpoint typically is /devices/{deviceId}/camera or /v1/devices/{deviceId}/camera
      // Our MieleClient prepends /v1 automatically based on MIELE_API_BASE_URL which is likely https://api.mcs3.miele.com/v1
      const data = await MieleClient.get(`/devices/${args.deviceId}/camera`);
      
      if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'The Miele API returned NO CONTENT. This is NOT an error with the MCP server or scopes. This simply means the oven is turned OFF or the door is OPEN. The Miele camera only works when the oven is actively running a program. Please instruct the user to turn on the oven and run a program to use the camera.',
            }
          ]
        };
      }

      let jsonStr = JSON.stringify(data);
      
      // Suche im JSON nach dem Base64-String (Miele liefert oft data:image/gif oder data:image/jpeg)
      const match = jsonStr.match(/data:image\/[^;]+;base64,([^"\\]+)/);
      
      if (match && match[1]) {
        return {
          content: [
            {
              type: 'image',
              data: match[1],
              mimeType: 'image/jpeg', // Wir erzwingen JPEG, da es meist JPEGs sind
            }
          ],
        };
      }

      // Fallback, falls kein Bild gefunden wurde
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          }
        ],
      };
    } catch (error: any) {
      // For images, sometimes it might return binary data. We'll handle it generically for now.
      // If it returns a 403, they need the mcs_thirdparty_media scope.
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Failed to retrieve camera image: ${error.message}. Note: You may need to re-authenticate to grant the 'mcs_thirdparty_media' scope.`,
          }
        ],
      };
    }
  },
};
