import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  // Phase 0 shell: liveness shape. Canonical type lives in
  // @sis/contracts (src/health.ts); workspace type-linking lands
  // with the first API slice, so the shape is mirrored here for now.
  getHealth(): { status: 'ok'; version: string } {
    return { status: 'ok', version: '0.1.0' };
  }
}
