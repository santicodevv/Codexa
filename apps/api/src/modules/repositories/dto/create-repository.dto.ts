import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'

export const REPOSITORY_PROVIDERS = ['github', 'gitlab', 'bitbucket', 'other', 'local'] as const

export class CreateRepositoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(/^[a-zA-Z0-9._\-/]+$/, {
    message: 'El nombre solo puede contener letras, números, punto, guion o slash',
  })
  name!: string

  @IsIn(REPOSITORY_PROVIDERS)
  provider!: (typeof REPOSITORY_PROVIDERS)[number]

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @Matches(/^(https?:\/\/|git@)[^\s]+$/, { message: 'URL de repositorio inválida' })
  url?: string

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  localPath?: string
}