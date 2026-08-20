export class GetAuditQuery {
  constructor(
    public readonly auditId: string,
    public readonly ownerId: string,
  ) {}
}