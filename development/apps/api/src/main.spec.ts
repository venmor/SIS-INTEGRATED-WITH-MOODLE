import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock('@nestjs/core', () => ({ NestFactory: { create: mocks.create } }));
// This test exercises the entry point, without connecting business modules
// to a database or requiring generated workspace build artifacts.
vi.mock('./app.module.js', () => ({ AppModule: class {} }));

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function mockApplication(init: () => Promise<void>) {
  const expressApp = Object.assign(vi.fn(), { set: vi.fn() });
  const app = {
    setGlobalPrefix: vi.fn(),
    useGlobalPipes: vi.fn(),
    getHttpAdapter: () => ({ getInstance: () => expressApp }),
    init: vi.fn(init),
    listen: vi.fn(),
  };
  mocks.create.mockResolvedValue(app);
  return { app, expressApp };
}

function requestAndResponse() {
  const request = new IncomingMessage(new Socket());
  return [request, new ServerResponse(request)] as const;
}

describe('Vercel API boot', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.create.mockReset();
    vi.stubEnv('VERCEL', '1');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('initializes once and holds simultaneous requests until all boot hooks finish', async () => {
    const started = deferred();
    const initialized = deferred();
    const { app, expressApp } = mockApplication(() => {
      started.resolve();
      return initialized.promise;
    });
    const { default: handler } = await import('./main.js');
    const first = requestAndResponse();
    const second = requestAndResponse();
    const pending = [handler(...first), handler(...second)];

    await started.promise;
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(app.init).toHaveBeenCalledTimes(1);
    expect(expressApp).not.toHaveBeenCalled();

    initialized.resolve();
    await Promise.all(pending);
    expect(expressApp).toHaveBeenCalledTimes(2);
    expect(expressApp).toHaveBeenNthCalledWith(1, ...first);
    expect(expressApp).toHaveBeenNthCalledWith(2, ...second);

    await handler(...requestAndResponse());
    expect(app.init).toHaveBeenCalledTimes(1);
    expect(expressApp).toHaveBeenCalledTimes(3);
    expect(app.setGlobalPrefix).toHaveBeenCalledWith('api');
    expect(app.listen).not.toHaveBeenCalled();
  });

  it('rejects waiting requests if boot fails without serving a partially initialized app', async () => {
    const started = deferred();
    const initialized = deferred();
    const { app, expressApp } = mockApplication(() => {
      started.resolve();
      return initialized.promise;
    });
    const { default: handler } = await import('./main.js');
    const failure = new Error('A required lifecycle hook failed');
    const first = expect(handler(...requestAndResponse())).rejects.toBe(failure);
    const second = expect(handler(...requestAndResponse())).rejects.toBe(failure);

    await started.promise;
    initialized.reject(failure);
    await Promise.all([first, second]);

    expect(app.init).toHaveBeenCalledTimes(1);
    expect(expressApp).not.toHaveBeenCalled();
    expect(app.listen).not.toHaveBeenCalled();
  });
});
