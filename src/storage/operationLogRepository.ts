import { db } from './db';

export interface OperationLogEntry {
  id: number;
  device_id: string;
  operation: string;
  allowed: boolean;
  executed: boolean;
  reason: string | null;
  created_at: number;
}

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

  // E1: Query recent operation log entries
  static async getRecentLogs(limit = 50): Promise<OperationLogEntry[]> {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT id, device_id, operation, allowed, executed, reason, created_at
         FROM operation_log
         ORDER BY created_at DESC
         LIMIT ?`,
        [limit],
        (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows.map(r => ({
            ...r,
            allowed: r.allowed === 1,
            executed: r.executed === 1,
          })));
        }
      );
    });
  }
}
