export interface TraeSettings extends RequestInit {
  url?: string;
  before: (config: RequestInit) => RequestInit;
  after: (res: any, config?: RequestInit) => any;
  params?: { [x: string]: unknown };
  json?: Boolean;
}

export interface TraeResponse extends Response {
  data?: any
}