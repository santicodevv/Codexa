export class RunAuditCommand {
  constructor(
    public readonly repositoryId: string,
    public readonly ownerId: string,
    public readonly provider?: string,
    public readonly model?: string,
  ) {}
}