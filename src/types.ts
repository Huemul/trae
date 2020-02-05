export type BodyType = 'arrayBuffer' | 'blob' | 'formData' | 'json' | 'text' | 'raw';

export interface PublicRequestConfig {
  // TODO: match `bodyType` to the type `body` can be
  bodyType?: BodyType;

  // types from `RequestInit`
  cache?: RequestCache;
  credentials?: RequestCredentials;
  headers?: HeadersInit;
  mode?: RequestMode;
  redirect?: RequestRedirect;
  integrity?: string;
  keepalive?: boolean;
  referrer?: string;
  referrerPolicy?: ReferrerPolicy;
  signal?: AbortSignal | null;
  window?: any;
  params?: { [x: string]: unknown };
}

interface WithBody extends PublicRequestConfig {
  method: 'PUT' | 'PATCH' | 'POST';
  body?: BodyInit | null;
}

interface NoBody extends PublicRequestConfig {
  method: 'GET' | 'HEAD' | 'DELETE';
}

export type RequestConfig = WithBody | NoBody;

export interface InstanceConfig extends PublicRequestConfig {
  url?: string;
  middleware: any;
}

export type BeforeHandler = (conf: PublicRequestConfig) => PublicRequestConfig
