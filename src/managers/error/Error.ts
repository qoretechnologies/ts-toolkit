class BaseError extends Error {
  statusCode?: number;

  isOperational: boolean;

  constructor(description: string, isOperational, name, statusCode) {
    super(description);

    Object.setPrototypeOf(this, new.target.prototype);
    this.name = name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    // This only works in a Node.js environment or via the V8 engine
    Error.captureStackTrace?.(this);
  }
}

export default BaseError;
