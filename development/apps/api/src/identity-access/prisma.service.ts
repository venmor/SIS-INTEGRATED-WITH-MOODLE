import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createRequire } from 'node:module';

// House pattern for CJS deps under ESM (proven in seed): values via require,
// types via `typeof import` (declaration files only — no build impact).
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg') as typeof import('@prisma/adapter-pg');

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleDestroy
{
  constructor() {
    super({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL as string,
      }),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
