export class CreateRepositoryCommand {
  constructor(
    public readonly ownerId: string,
    public readonly name: string,
    public readonly provider: string,
    public readonly url?: string,
    public readonly localPath?: string,
  ) {}
}