export class DeleteRepositoryCommand {
  constructor(
    public readonly repositoryId: string,
    public readonly ownerId: string,
  ) {}
}