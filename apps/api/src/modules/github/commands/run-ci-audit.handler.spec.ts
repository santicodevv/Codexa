import type { AuditsService } from '../../audits/audits.service'
import { RunCiAuditCommand } from './run-ci-audit.command'
import { RunCiAuditHandler } from './run-ci-audit.handler'

describe('RunCiAuditHandler', () => {
  it('delega en AuditsService.enqueue con los parámetros del command', async () => {
    const audits = { enqueue: jest.fn().mockResolvedValue({ id: 'audit-1', status: 'pending' }) }
    const handler = new RunCiAuditHandler(audits as unknown as AuditsService)

    const result = await handler.execute(
      new RunCiAuditCommand('repo-1', 'owner-1', 'feature/x', 'anthropic', 'claude-sonnet-4-5'),
    )

    expect(audits.enqueue).toHaveBeenCalledWith(
      'repo-1',
      'owner-1',
      'anthropic',
      'claude-sonnet-4-5',
      'feature/x',
    )
    expect(result).toEqual({ id: 'audit-1', status: 'pending' })
  })
})
