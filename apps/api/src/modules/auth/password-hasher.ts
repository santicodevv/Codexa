import { Injectable } from '@nestjs/common'
import * as bcrypt from 'bcrypt'

const BCRYPT_COST = 12

@Injectable()
export class PasswordHasher {
  async hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, BCRYPT_COST)
  }

  async verify(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash)
  }
}