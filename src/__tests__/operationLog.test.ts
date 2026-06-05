import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { OperationLogRepository } from '../storage/operationLogRepository';
import { db } from '../storage/db';

describe('OperationLogRepository', () => {
  beforeAll(async () => {
    // Clear operation_log table before tests
    await new Promise<void>((resolve, reject) => {
      db.run('DELETE FROM operation_log', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      db.run('DELETE FROM operation_log', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  it('should log an operation and retrieve it via getRecentLogs', async () => {
    await OperationLogRepository.log('device-001', 'put_device_action (processAction)', true, true);
    // Wait 1100ms so the second log entry gets a different created_at (SQLite stores Unix seconds)
    await new Promise(r => setTimeout(r, 1100));
    await OperationLogRepository.log('device-002', 'start_device_program (programId: 1)', false, false, 'Preflight failed: Program not available');

    const entries = await OperationLogRepository.getRecentLogs(10);
    expect(entries.length).toBe(2);

    // Most recent first
    const first = entries[0];
    expect(first.device_id).toBe('device-002');
    expect(first.allowed).toBe(false);
    expect(first.executed).toBe(false);
    expect(first.reason).toBe('Preflight failed: Program not available');

    const second = entries[1];
    expect(second.device_id).toBe('device-001');
    expect(second.allowed).toBe(true);
    expect(second.executed).toBe(true);
    expect(second.reason).toBeNull();
  });

  it('should respect the limit parameter in getRecentLogs', async () => {
    const entries = await OperationLogRepository.getRecentLogs(1);
    expect(entries.length).toBe(1);
  });
});
