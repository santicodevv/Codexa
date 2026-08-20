export class GetCiAuditQuery {
  constructor(
    public readonly auditId: string,
    public readonly repositoryId: string,
  ) {}
}
