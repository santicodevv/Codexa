export class Result<T, E = string> {
  private constructor(
    private readonly value: T | undefined,
    private readonly error: E | undefined,
    private readonly success: boolean,
  ) {}

  static ok<T, E = string>(value: T): Result<T, E> {
    return new Result<T, E>(value, undefined, true)
  }

  static err<T, E = string>(error: E): Result<T, E> {
    return new Result<T, E>(undefined, error, false)
  }

  isOk(): this is Result<T, never> {
    return this.success
  }

  isErr(): this is Result<never, E> {
    return !this.success
  }

  getOrThrow(): T {
    if (!this.success) {
      throw new Error(`Result error: ${String(this.error)}`)
    }
    return this.value as T
  }

  getError(): E | undefined {
    return this.error
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    return this.success ? Result.ok<U, E>(fn(this.value as T)) : Result.err<U, E>(this.error as E)
  }
}
