export interface MieleApiErrorDetails {
  status: number;
  message: string;
  requestId?: string;
  raw?: any;
}

export class MieleApiError extends Error {
  public status: number;
  public requestId?: string;
  public raw?: any;

  constructor(details: MieleApiErrorDetails) {
    super(details.message);
    this.name = 'MieleApiError';
    this.status = details.status;
    this.requestId = details.requestId;
    this.raw = details.raw;
  }
}
