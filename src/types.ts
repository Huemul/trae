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

export interface InstanceConfig extends TraeSettings {
  url?: string;
}
