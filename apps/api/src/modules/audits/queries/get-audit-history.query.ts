export class GetAuditHistoryQuery {
  constructor(
    public readonly repositoryId: string,
    public readonly ownerId: string,
    public readonly page: number = 1,
    public readonly pageSize: number = 20,
  ) {}
}