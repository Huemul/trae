// https://reddit.com/r/typescript/comments/9u9107/extends_error_not_working/e92juau/?utm_source=reddit&utm_medium=web2x&context=3
// https://github.com/Microsoft/TypeScript/wiki/Breaking-Changes#extending-built-ins-like-error-array-and-map-may-no-longer-work
export class TraeError extends Error {
  __proto__ = Error;

  public statusText?: string;
  public status?: number;

  constructor(statusText: string, status: number) {
    super(statusText);
    this.statusText = statusText;
    this.status = status;

    Object.setPrototypeOf(this, TraeError.prototype);
  }
}
