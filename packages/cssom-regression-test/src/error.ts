export class UnknownError extends Error {
  constructor(cause: unknown) {
    super('Unknown error', { cause })
  }
}
