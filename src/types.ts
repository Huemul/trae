export type BodyType =
  | 'arrayBuffer'
  | 'blob'
  | 'formData'
  | 'json'
  | 'text'
  | 'raw';

export interface TraeSettings extends RequestInit {
  url?: string;
  bodyType?: BodyType;
  before: (conf: RequestInit) => RequestInit;
  onResolve: (response: unknown) => Promise<unknown>;
  onReject: (error: unknown) => Promise<unknown>;
  params?: { [x: string]: unknown };
}

interface WithBody extends RequestInit {
  method: 'PUT' | 'PATCH' | 'POST';
  body?: BodyInit | null;
}

interface NoBody extends RequestInit {
  method: 'GET' | 'HEAD' | 'DELETE';
}

export type RequestConfig = WithBody | NoBody;

export interface InstanceConfig extends TraeSettings {
  url?: string;
}
