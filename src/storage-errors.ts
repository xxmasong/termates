/**
 * storage-errors.ts — input errors raised by storage before touching disk.
 * Mapped to HTTP 400/409 by services/errors.ts (and to GraphQL extensions).
 */

export class InvalidInputError extends Error {
  readonly code = 'INVALID_INPUT';

  constructor(message: string) {
    super(message);
    this.name = 'InvalidInputError';
  }

  toJSON() {
    return { error: this.message, code: this.code };
  }
}

export class ConflictError extends Error {
  readonly code = 'CONFLICT';

  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }

  toJSON() {
    return { error: this.message, code: this.code };
  }
}
