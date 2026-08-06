export class ServiceException extends Error {
  constructor(
    message: string,
    public readonly code: string = 'service.error',
    public readonly status: number = 500,
  ) {
    super(message)
    this.name = 'ServiceException'
  }
}
