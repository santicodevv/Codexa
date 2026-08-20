export class RunCiAuditCommand {
  constructor(
    public readonly repositoryId: string,
    public readonly ownerId: string,
    public readonly ref?: string,
    public readonly provider?: string,
    public readonly model?: string,
  ) {}
}
