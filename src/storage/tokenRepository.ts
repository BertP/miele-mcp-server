import { db } from './db';

export interface TokenRecord {
  id: number;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  created_at: number;
  updated_at: number;
}

export class TokenRepository {
  static async saveTokens(accessToken: string, refreshToken: string, expiresIn: number): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + expiresIn;

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO tokens (id, access_token, refresh_token, expires_at, created_at, updated_at)
         VALUES (1, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           access_token=excluded.access_token,
           refresh_token=excluded.refresh_token,
           expires_at=excluded.expires_at,
           updated_at=excluded.updated_at`,
        [accessToken, refreshToken, expiresAt, now, now],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  static async getTokens(): Promise<TokenRecord | null> {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM tokens WHERE id = 1', (err, row) => {
        if (err) reject(err);
        else resolve((row as TokenRecord) || null);
      });
    });
  }

  static async deleteTokens(): Promise<void> {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM tokens WHERE id = 1', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  static async saveState(state: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO oauth_states (state, created_at) VALUES (?, ?)',
        [state, now],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  static async consumeState(state: string): Promise<boolean> {
    const now = Math.floor(Date.now() / 1000);
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE oauth_states SET consumed_at = ? WHERE state = ? AND consumed_at IS NULL',
        [now, state],
        function (err) {
          if (err) reject(err);
          // @ts-ignore: this.changes is provided by sqlite3
          else resolve(this.changes > 0);
        }
      );
    });
  }
}
