export class GenerateCiKeyCommand {
  constructor(
    public readonly repositoryId: string,
    public readonly ownerId: string,
  ) {}
}
