import { BodyType } from './types';

export function isFormData(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

export function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer;
}

export function isBlob(value: unknown): value is Blob {
  return typeof Blob !== 'undefined' && value instanceof Blob;
}

export function isReadableStream(value: unknown): value is ReadableStream {
  return (
    typeof ReadableStream !== 'undefined' && value instanceof ReadableStream
  );
}

export function isURLSearchParams(value: unknown): value is URLSearchParams {
  return (
    typeof URLSearchParams !== 'undefined' && value instanceof URLSearchParams
  );
}

export function isValidReader(reader: string): reader is BodyType {
  return ['arrayBuffer', 'blob', 'formData', 'json', 'text', 'raw'].includes(
    reader,
  );
}

// TODO: this function is inconplete
export function isValidBody(content: unknown): content is BodyInit {
  if (typeof content === 'string') {
    return true;
  }
  if (isArrayBuffer(content)) {
    return true;
  }
  if (isBlob(content)) {
    return true;
  }
  if (isFormData(content)) {
    return true;
  }
  if (isReadableStream(content)) {
    return true;
  }
  return isURLSearchParams(content);
}
