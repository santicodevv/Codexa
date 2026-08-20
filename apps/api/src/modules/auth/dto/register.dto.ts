import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'

export class RegisterDto {
  @IsEmail({}, { message: 'Email inválido' })
  @MaxLength(254)
  email!: string

  @IsString()
  @MinLength(12, { message: 'La contraseña debe tener al menos 12 caracteres' })
  @MaxLength(128)
  @Matches(/[a-zA-Z]/, { message: 'La contraseña debe contener al menos una letra' })
  @Matches(/\d/, { message: 'La contraseña debe contener al menos un número' })
  @Matches(/[^a-zA-Z0-9]/, { message: 'La contraseña debe contener al menos un símbolo' })
  password!: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string
}