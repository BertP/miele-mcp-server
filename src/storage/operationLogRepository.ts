import { db } from './db';

export class OperationLogRepository {
  static async log(
    deviceId: string,
    operation: string,
    allowed: boolean,
    executed: boolean,
    reason?: string
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO operation_log (device_id, operation, allowed, executed, reason, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [deviceId, operation, allowed ? 1 : 0, executed ? 1 : 0, reason || null, now],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }
}
