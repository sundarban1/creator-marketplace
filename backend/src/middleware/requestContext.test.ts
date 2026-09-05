import { describe, it, expect } from 'vitest';
import type { Request, Response } from 'express';
import { requestContext, getRequestContext } from './requestContext';

function fakeReq(overrides: Partial<Request> = {}): Request {
  return {
    id: 'req_abc123',
    ip: '203.0.113.5',
    headers: { 'user-agent': 'jest-agent/1.0' },
    ...overrides,
  } as unknown as Request;
}

describe('requestContext', () => {
  it('exposes the same request id pino-http (req.id) generated', () => {
    let seen: ReturnType<typeof getRequestContext>;
    requestContext(fakeReq(), {} as Response, () => {
      seen = getRequestContext();
    });

    expect(seen?.requestId).toBe('req_abc123');
    expect(seen?.ip).toBe('203.0.113.5');
    expect(seen?.userAgent).toBe('jest-agent/1.0');
  });

  it('coerces a non-string req.id to a string', () => {
    let seen: ReturnType<typeof getRequestContext>;
    requestContext(fakeReq({ id: 12345 as unknown as string }), {} as Response, () => {
      seen = getRequestContext();
    });

    expect(seen?.requestId).toBe('12345');
  });

  it('is undefined outside of any request scope', () => {
    expect(getRequestContext()).toBeUndefined();
  });

  it('reads x-device-id when present', () => {
    let seen: ReturnType<typeof getRequestContext>;
    requestContext(fakeReq({ headers: { 'x-device-id': 'device-42' } }), {} as Response, () => {
      seen = getRequestContext();
    });

    expect(seen?.deviceId).toBe('device-42');
  });

  it('does not leak context across separate request runs', () => {
    let first: ReturnType<typeof getRequestContext>;
    requestContext(fakeReq({ id: 'req_one' }), {} as Response, () => {
      first = getRequestContext();
    });

    let second: ReturnType<typeof getRequestContext>;
    requestContext(fakeReq({ id: 'req_two' }), {} as Response, () => {
      second = getRequestContext();
    });

    expect(first?.requestId).toBe('req_one');
    expect(second?.requestId).toBe('req_two');
  });
});
