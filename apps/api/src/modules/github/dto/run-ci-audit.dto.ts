import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator'
import { LlmProvider } from '@codexa/contracts'

const LLM_PROVIDERS = Object.values(LlmProvider)

export class RunCiAuditDto {
  // Rama a auditar (ej. la head branch de un PR). Sin esto se audita la rama por defecto.
  @IsOptional()
  @IsString()
  @Matches(/^[\w./-]+$/, { message: 'ref inválida' })
  @MaxLength(250)
  ref?: string

  @IsOptional()
  @IsIn(LLM_PROVIDERS)
  provider?: LlmProvider

  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string
}
