import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as argon2 from 'argon2';

export type PasswordAlgorithm = 'bcrypt' | 'argon2';

export interface PasswordHashResult {
  hash: string;
  algorithm: PasswordAlgorithm;
  updatedAt: Date;
}

export interface PasswordVerifyResult {
  valid: boolean;
  algorithm: PasswordAlgorithm;
  needsRehash: boolean;
}

@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);

  // Low-memory, production-safe Argon2id parameters (do not change).
  private readonly argon2Options: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 16384, // 16 MB
    timeCost: 2,
    parallelism: 1,
    hashLength: 32,
  };

  async hashPassword(plain: string): Promise<PasswordHashResult> {
    const hash = await argon2.hash(plain, this.argon2Options);
    return {
      hash,
      algorithm: 'argon2',
      updatedAt: new Date(),
    };
  }

  async verifyPassword(
    plain: string,
    hash: string,
    passwordAlgo?: string | null,
  ): Promise<PasswordVerifyResult> {
    const algorithm = this.resolveAlgorithm(passwordAlgo, hash);
    let valid = false;

    if (algorithm === 'argon2') {
      try {
        valid = await argon2.verify(hash, plain);
      } catch (error) {
        this.logger.warn(`Argon2 verify failed: ${(error as Error).message}`);
        valid = false;
      }
    } else {
      try {
        valid = await bcrypt.compare(plain, String(hash));
      } catch (error) {
        this.logger.warn(`bcrypt verify failed: ${(error as Error).message}`);
        valid = false;
      }
    }

    return {
      valid,
      algorithm,
      needsRehash: valid && algorithm === 'bcrypt',
    };
  }

  private resolveAlgorithm(
    passwordAlgo?: string | null,
    hash?: string | null,
  ): PasswordAlgorithm {
    if (passwordAlgo === 'argon2') return 'argon2';
    if (passwordAlgo === 'bcrypt') return 'bcrypt';

    // Defensive fallback for legacy hashes that lack passwordAlgo.
    // Argon2 hashes are prefixed with "$argon2".
    if (hash && hash.startsWith('$argon2')) {
      return 'argon2';
    }

    return 'bcrypt';
  }
}
