export class GetHealthTrendQuery {
  constructor(
    public readonly repositoryId: string,
    public readonly ownerId: string,
    public readonly limit: number = 20,
  ) {}
}
