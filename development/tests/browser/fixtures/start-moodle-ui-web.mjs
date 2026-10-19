import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const child = spawn(process.execPath, [resolve('node_modules/next/dist/bin/next'), 'start', 'apps/web', '--hostname', '127.0.0.1', '--port', '3711'], { stdio: 'inherit', env: { ...process.env, API_INTERNAL_URL: 'http://127.0.0.1:3710' } });
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
child.on('exit', (code) => process.exit(code ?? 1));
