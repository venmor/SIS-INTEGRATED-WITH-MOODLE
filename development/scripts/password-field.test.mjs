import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('PasswordField source has onKeyDown, onKeyUp, and caps-lock id linked in aria-describedby', () => {
  const code = readFileSync(
    join(process.cwd(), 'packages', 'ui', 'src', 'PasswordField.tsx'),
    'utf8'
  );

  assert.match(code, /capsId\s*=\s*capsOn\s*\?\s*`\${id}-caps`\s*:\s*undefined/);
  assert.match(code, /\[helpId,\s*capsId,\s*errorId\]/);
  assert.match(code, /onKeyDown=\{handleModifierCheck\}/);
  assert.match(code, /onKeyUp=\{handleModifierCheck\}/);
  assert.match(code, /id=\{capsId\}/);
});
