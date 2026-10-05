import crypto from 'crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

const env = vi.hoisted(() => ({
  CONNECTIPS_MERCHANT_ID:     '550',
  CONNECTIPS_APP_ID:          'MER-550-APP-1',
  CONNECTIPS_APP_NAME:        'Kolab',
  CONNECTIPS_APP_PASSWORD:    'secret',
  CONNECTIPS_PRIVATE_KEY:     '' as string,
  CONNECTIPS_GATEWAY_URL:     'https://uat.connectips.com/connectipswebgw/loginpage',
  CONNECTIPS_VALIDATE_URL:    'https://uat.connectips.com/connectipswebws/api/creditor/validatetxn',
  CONNECTIPS_RETURN_BASE_URL: 'https://api.example.com',
}));
vi.mock('../config/env', () => ({ env }));
vi.mock('../config/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock('../config/observability', () => ({ reportError: vi.fn(), LogEvent: {} }));

import {
  buildConnectIpsSignedFields,
  validateConnectIpsTxn,
  friendlyConnectIpsStatusMessage,
  newConnectIpsTxnId,
  platformFromTxnId,
  toPaisa,
} from './connectips';

function verify(message: string, signature: string): boolean {
  return crypto.createVerify('RSA-SHA256').update(message).verify(publicKey, signature, 'base64');
}

beforeEach(() => {
  env.CONNECTIPS_PRIVATE_KEY = privatePem;
  vi.restoreAllMocks();
});

describe('toPaisa', () => {
  it('rounds NPR to integer paisa without float drift', () => {
    expect(toPaisa(4460)).toBe(446000);
    expect(toPaisa(1234.5)).toBe(123450);
    expect(toPaisa(0.1 + 0.2)).toBe(30);
  });
});

describe('newConnectIpsTxnId', () => {
  it('fits NCHL\'s 20-char limit and encodes the platform', () => {
    const web = newConnectIpsTxnId('web');
    const mobile = newConnectIpsTxnId('mobile');
    expect(web).toHaveLength(20);
    expect(mobile).toHaveLength(20);
    expect(platformFromTxnId(web)).toBe('web');
    expect(platformFromTxnId(mobile)).toBe('mobile');
    expect(newConnectIpsTxnId('web')).not.toBe(web);
  });
});

describe('buildConnectIpsSignedFields', () => {
  it('signs the documented field string with SHA256withRSA, amount in paisa', () => {
    const f = buildConnectIpsSignedFields({ txnId: 'M123', amountPaisa: 123450 });
    expect(f.TXNAMT).toBe('123450');
    expect(f.TXNDATE).toMatch(/^\d{2}-\d{2}-\d{4}$/);
    const message =
      `MERCHANTID=550,APPID=MER-550-APP-1,APPNAME=Kolab,TXNID=M123,TXNDATE=${f.TXNDATE},` +
      `TXNCRNCY=NPR,TXNAMT=123450,REFERENCEID=M123,REMARKS=${f.REMARKS},PARTICULARS=${f.PARTICULARS},TOKEN=TOKEN`;
    expect(verify(message, f.TOKEN)).toBe(true);
    expect(f.REMARKS.length).toBeLessThanOrEqual(50);
    expect(f.APPNAME.length).toBeLessThanOrEqual(30);
  });

  it('accepts the key as a single line with \\n escapes or base64', () => {
    env.CONNECTIPS_PRIVATE_KEY = privatePem.replace(/\n/g, '\\n');
    expect(() => buildConnectIpsSignedFields({ txnId: 'M1', amountPaisa: 1000 })).not.toThrow();
    env.CONNECTIPS_PRIVATE_KEY = Buffer.from(privatePem).toString('base64');
    expect(() => buildConnectIpsSignedFields({ txnId: 'M1', amountPaisa: 1000 })).not.toThrow();
  });
});

describe('validateConnectIpsTxn', () => {
  it('posts a signed body with basic auth and returns the status', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'SUCCESS', statusDesc: 'TRANSACTION SUCCESSFUL' }), { status: 200 }),
    );
    const result = await validateConnectIpsTxn({ txnId: 'W9', amountPaisa: 50000 });
    expect(result).toEqual({ status: 'SUCCESS', statusDesc: 'TRANSACTION SUCCESSFUL' });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init!.body));
    expect(body).toMatchObject({ merchantId: 550, appId: 'MER-550-APP-1', referenceId: 'W9', txnAmt: 50000 });
    expect(verify('MERCHANTID=550,APPID=MER-550-APP-1,REFERENCEID=W9,TXNAMT=50000', body.token)).toBe(true);
    expect((init!.headers as Record<string, string>).Authorization).toBe(
      `Basic ${Buffer.from('MER-550-APP-1:secret').toString('base64')}`,
    );
  });

  it('treats a 401 as a gateway error, not a payment outcome', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 401 }));
    await expect(validateConnectIpsTxn({ txnId: 'W9', amountPaisa: 50000 })).rejects.toThrow();
  });
});

describe('friendlyConnectIpsStatusMessage', () => {
  it('distinguishes the documented non-success outcomes', () => {
    const failed = friendlyConnectIpsStatusMessage({ status: 'FAILED', statusDesc: 'TRANSACTION UNSUCCESSFUL' });
    const notFound = friendlyConnectIpsStatusMessage({ status: 'ERROR', statusDesc: 'TRANSACTION NOT FOUND' });
    const incomplete = friendlyConnectIpsStatusMessage({ status: 'ERROR', statusDesc: 'TRANSACTION INCOMPLETE' });
    expect(new Set([failed, notFound, incomplete]).size).toBe(3);
  });
});
