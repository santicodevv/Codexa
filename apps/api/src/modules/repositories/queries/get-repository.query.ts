export class GetRepositoryQuery {
  constructor(
    public readonly repositoryId: string,
    public readonly ownerId: string,
  ) {}
}