import { Controller, Get, NotFoundException, Param, Req, UseGuards } from '@nestjs/common';
import { AUTH_MESSAGES } from '@sis/config';
import { SessionGuard } from './session.guard.js';
import { PrismaService } from './prisma.service.js';

interface CommandRequest {
  auth?: { accountId: string; sessionToken: string };
}

// Uncertain-outcome receipts (UI-SUBMIT-001 step 5): after a connection loss,
// the client checks the stored receipt by idempotency key before retrying.
// Scoped to the requester's own account; misses stay neutral.
@Controller('auth/commands')
export class CommandsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':key')
  @UseGuards(SessionGuard)
  async receipt(@Param('key') key: string, @Req() req: CommandRequest) {
    const row = await this.prisma.idempotencyKey.findUnique({ where: { key } });
    if (!row || row.accountId !== req.auth?.accountId) {
      throw new NotFoundException({ message: AUTH_MESSAGES.grantDenied.text });
    }
    return { status: row.status, response: row.response };
  }
}
