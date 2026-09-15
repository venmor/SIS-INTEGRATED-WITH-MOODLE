import { validate } from 'class-validator';
import type {
  RecoveryConfirmBody,
  RecoveryRequestBody,
  SignInBody,
  SignInResponse,
} from '@sis/contracts';
import { RecoveryConfirmDto, RecoveryRequestDto, SignInDto } from './dto.js';

// Structural proof that local DTOs satisfy the canonical contracts package.
// Type-checked by editors and type-aware lint (specs are excluded from the
// build so cross-package .ts imports stay out of emit); runtime assertions
// below prove validation behaviour.
function consumesSignIn(body: SignInBody): string {
  return body.username;
}
function consumesConfirm(body: RecoveryConfirmBody): string {
  return body.token;
}

describe('auth contract compatibility', () => {
  it('DTO shapes satisfy canonical contracts', () => {
    const signIn = new SignInDto();
    signIn.username = 'u';
    signIn.password = 'p';
    expect(consumesSignIn(signIn)).toBe('u');
    const confirm = new RecoveryConfirmDto();
    confirm.token = 't';
    confirm.newPassword = 'long-enough-password';
    expect(consumesConfirm(confirm)).toBe('t');
    const req: RecoveryRequestBody = new RecoveryRequestDto();
    expect(req).toBeDefined();
    const responseShape: SignInResponse = {
      account: { accountId: 'a', personId: 'p', username: 'u', displayName: 'n' },
      message: 'm',
    };
    expect(responseShape.account.username).toBe('u');
  });

  it('rejects short passwords per SECURITY-v1 minimum', async () => {
    const dto = new RecoveryConfirmDto();
    dto.token = 't';
    dto.newPassword = 'short';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
