import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator'
import { LlmProvider } from '@codexa/contracts'

const LLM_PROVIDERS = Object.values(LlmProvider)

export class RunAuditDto {
  @IsOptional()
  @IsIn(LLM_PROVIDERS)
  provider?: LlmProvider

  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string
}