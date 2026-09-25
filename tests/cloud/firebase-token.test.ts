import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { before, describe, it } from 'node:test';

import {
  KeyStore,
  TokenError,
  verifyIdToken,
  type KeySet,
} from '../../src/cloud/firebase-token.js';

const PROJECT = 'termhive-test';
const NOW = Date.UTC(2026, 8, 25, 12, 0, 0);
const NOW_S = NOW / 1000;

const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

const sign = (
  privateKey: crypto.KeyObject,
  claims: Record<string, unknown>,
  header: Record<string, unknown> = { alg: 'RS256', kid: 'k1', typ: 'JWT' },
) => {
  const body = `${b64(header)}.${b64(claims)}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(body), privateKey).toString('base64url');
  return `${body}.${signature}`;
};

const goodClaims = (overrides: Record<string, unknown> = {}) => ({
  iss: `https://securetoken.google.com/${PROJECT}`,
  aud: PROJECT,
  sub: 'firebase-uid-1',
  iat: NOW_S - 10,
  exp: NOW_S + 3600,
  auth_time: NOW_S - 10,
  email: 'dev@example.com',
  email_verified: true,
  firebase: { sign_in_provider: 'password' },
  ...overrides,
});

/** A self-signed x509 cert, the format Google publishes, made with openssl. */
const makeCert = (): { cert: string; privateKey: crypto.KeyObject } => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'termhive-jwt-'));
  try {
    const keyFile = path.join(dir, 'key.pem');
    const certFile = path.join(dir, 'cert.pem');
    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-nodes',
        '-keyout',
        keyFile,
        '-out',
        certFile,
        '-days',
        '1',
        '-subj',
        '/CN=securetoken.system.gserviceaccount.com',
      ],
      { stdio: 'ignore' },
    );
    return {
      cert: fs.readFileSync(certFile, 'utf-8'),
      privateKey: crypto.createPrivateKey(fs.readFileSync(keyFile)),
    };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

describe('verifyIdToken', () => {
  let privateKey: crypto.KeyObject;
  let otherKey: crypto.KeyObject;
  let fetches = 0;
  let keys: KeyStore;

  before(() => {
    const made = makeCert();
    privateKey = made.privateKey;
    otherKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
    keys = new KeyStore(
      async (): Promise<KeySet> => {
        fetches += 1;
        return { keys: { k1: made.cert }, expiresAt: NOW + 60_000 };
      },
      () => NOW,
    );
  });

  const verify = (token: string) => verifyIdToken(token, { projectId: PROJECT, keys, now: NOW });

  it('accepts a correctly signed token and returns its claims', async () => {
    const claims = await verify(sign(privateKey, goodClaims()));
    assert.equal(claims.sub, 'firebase-uid-1');
    assert.equal(claims.email_verified, true);
  });

  it('caches the key set between verifications', async () => {
    const before = fetches;
    await verify(sign(privateKey, goodClaims()));
    await verify(sign(privateKey, goodClaims()));
    assert.equal(fetches, before);
  });

  const rejects = async (token: string, pattern: RegExp) =>
    assert.rejects(
      verify(token),
      (err: unknown) => err instanceof TokenError && pattern.test(err.message),
    );

  it('rejects a bad signature', () => rejects(sign(otherKey, goodClaims()), /signature/));
  it('rejects an unknown kid', () =>
    rejects(sign(privateKey, goodClaims(), { alg: 'RS256', kid: 'nope' }), /Unknown signing key/));
  it('rejects alg none / HS256', async () => {
    await rejects(sign(privateKey, goodClaims(), { alg: 'none', kid: 'k1' }), /algorithm/);
    await rejects(sign(privateKey, goodClaims(), { alg: 'HS256', kid: 'k1' }), /algorithm/);
  });
  it('rejects the wrong audience', () =>
    rejects(sign(privateKey, goodClaims({ aud: 'other' })), /audience/));
  it('rejects the wrong issuer', () =>
    rejects(
      sign(privateKey, goodClaims({ iss: 'https://securetoken.google.com/other' })),
      /issuer/,
    ));
  it('rejects an expired token', () =>
    rejects(sign(privateKey, goodClaims({ exp: NOW_S - 120 })), /expired/));
  it('rejects iat in the future', () =>
    rejects(sign(privateKey, goodClaims({ iat: NOW_S + 600 })), /future/));
  it('rejects auth_time in the future or missing', async () => {
    await rejects(sign(privateKey, goodClaims({ auth_time: NOW_S + 600 })), /auth_time/);
    await rejects(sign(privateKey, goodClaims({ auth_time: undefined })), /auth_time/);
  });
  it('rejects an empty subject', () =>
    rejects(sign(privateKey, goodClaims({ sub: '' })), /subject/));
  it('rejects garbage', async () => {
    await rejects('not-a-jwt', /Malformed/);
    await rejects('a.b.c', /Malformed/);
  });
});
