import { config } from '../config';
import { TokenService } from '../auth/tokenService';
import { MieleApiError } from './mieleErrors';
import crypto from 'crypto';

export class MieleClient {
  private static async getAuthHeaders(): Promise<HeadersInit> {
    const token = await TokenService.getValidToken();
    if (!token) {
      throw new Error('No valid token available. User must authenticate first.');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-request-id': crypto.randomUUID(),
    };
  }

  private static async handleResponse(response: Response): Promise<any> {
    const requestId = response.headers.get('x-request-id') || undefined;

    if (!response.ok) {
      let raw;
      try {
        raw = await response.json();
      } catch {
        raw = await response.text();
      }

      throw new MieleApiError({
        status: response.status,
        message: `Miele API error: ${response.statusText}`,
        requestId,
        raw,
      });
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  static async get(endpoint: string): Promise<any> {
    const url = `${config.MIELE_API_BASE_URL}${endpoint}`;
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    return this.handleResponse(response);
  }

  static async put(endpoint: string, body: any): Promise<any> {
    const url = `${config.MIELE_API_BASE_URL}${endpoint}`;
    const headers = await this.getAuthHeaders();

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    return this.handleResponse(response);
  }
}
