import { describe, it, expect, vi, beforeEach } from 'vitest';
import { putDeviceActionTool } from '../mcp/tools/putDeviceAction';
import { MieleClient } from '../miele/mieleClient';
import { OperationLogRepository } from '../storage/operationLogRepository';

vi.mock('../miele/mieleClient', () => {
  return {
    MieleClient: {
      get: vi.fn(),
      put: vi.fn(),
    },
  };
});

vi.mock('../storage/operationLogRepository', () => {
  return {
    OperationLogRepository: {
      log: vi.fn().mockResolvedValue(undefined),
    },
  };
});

describe('Preflight Logic - putDeviceAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fail preflight if action is not available', async () => {
    const mockAvailableActions = {
      processAction: [1, 2], // 1=Start, 2=Stop
    };

    vi.mocked(MieleClient.get).mockResolvedValue(mockAvailableActions);

    const result = await putDeviceActionTool.handler({
      deviceId: 'device-1',
      body: {
        nonExistentAction: 1,
      },
    });

    expect(result.content[0].text).toContain("Preflight failed: Action 'nonExistentAction' is not currently available");
    expect(vi.mocked(OperationLogRepository.log)).toHaveBeenCalledWith(
      'device-1',
      'put_device_action (nonExistentAction)',
      false,
      false,
      expect.stringContaining("Action 'nonExistentAction' is not currently available")
    );
  });

  it('should fail preflight if action value is not in permitted list', async () => {
    const mockAvailableActions = {
      processAction: [1, 2],
    };

    vi.mocked(MieleClient.get).mockResolvedValue(mockAvailableActions);

    const result = await putDeviceActionTool.handler({
      deviceId: 'device-1',
      body: {
        processAction: 3, // Not permitted (only 1 or 2)
      },
    });

    expect(result.content[0].text).toContain("Preflight failed: Value '3' for action 'processAction' is not currently permitted");
    expect(vi.mocked(OperationLogRepository.log)).toHaveBeenCalledWith(
      'device-1',
      'put_device_action (processAction)',
      false,
      false,
      expect.stringContaining("Value '3' for action 'processAction' is not currently permitted")
    );
  });

  it('should pass preflight and execute PUT request on valid input', async () => {
    const mockAvailableActions = {
      processAction: [1, 2],
    };

    vi.mocked(MieleClient.get).mockResolvedValue(mockAvailableActions);
    vi.mocked(MieleClient.put).mockResolvedValue({ status: 'ok' });

    const result = await putDeviceActionTool.handler({
      deviceId: 'device-1',
      body: {
        processAction: 1,
      },
    });

    expect(result.content[0].text).toContain('ok');
    expect(vi.mocked(MieleClient.put)).toHaveBeenCalledWith('/devices/device-1/actions', { processAction: 1 });
    expect(vi.mocked(OperationLogRepository.log)).toHaveBeenCalledWith(
      'device-1',
      'put_device_action (processAction)',
      true,
      true
    );
  });
});
