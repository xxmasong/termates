/**
 * auth-routes.ts — /auth/config, /auth/session, /auth/me, /auth/logout.
 */

import express, { Router, type NextFunction, type Request, type Response } from 'express';

import { AccountError, type Accounts } from './accounts.js';
import { isPlanId, type CloudConfig } from './config.js';
import type { CloudDb } from './db.js';
import { TokenError, verifyIdToken, type KeyStore } from './firebase-token.js';
import { clientIp, isAllowedOrigin, RateLimiter } from './guards.js';
import type { Provisioner } from './provisioner.js';
import { workspaceUsage } from './usage.js';
import {
  clearedSessionCookie,
  createSession,
  hashToken,
  resolveSession,
  sessionCookie,
} from './sessions.js';

const SESSION_RATE_LIMIT = 20;
const SESSION_RATE_WINDOW_MS = 10 * 60 * 1000;
const BODY_LIMIT = '64kb';

export interface AuthDeps {
  db: CloudDb;
  config: CloudConfig;
  accounts: Accounts;
  provisioner: Provisioner;
  keys: KeyStore;
}

/** Express 4 does not catch async rejections; forward them to next(). */
const asyncRoute =
  (handler: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };

const fail = (res: Response, status: number, code: string, error: string) =>
  res.status(status).json({ error, code });

export function createAuthRouter({ db, config, accounts, provisioner, keys }: AuthDeps): Router {
  const router = Router();
  const limiter = new RateLimiter(SESSION_RATE_LIMIT, SESSION_RATE_WINDOW_MS);

  router.use(express.json({ limit: BODY_LIMIT }));
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  // CSRF: every state-changing /auth request must come from our own origin.
  router.use((req, res, next) => {
    if (
      req.method !== 'GET' &&
      req.method !== 'HEAD' &&
      !isAllowedOrigin(req, config.allowedOrigins)
    ) {
      fail(res, 403, 'BAD_ORIGIN', 'Cross-site request refused.');
      return;
    }
    next();
  });

  router.get('/config', (_req, res) => {
    res.json(
      config.firebase
        ? { configured: true, signupMode: config.signupMode, ...config.firebase }
        : { configured: false, signupMode: config.signupMode },
    );
  });

  router.post(
    '/session',
    asyncRoute(async (req: Request, res: Response) => {
      const ip = clientIp(req);
      if (!limiter.take(ip)) {
        fail(res, 429, 'RATE_LIMITED', 'Too many attempts. Try again in a few minutes.');
        return;
      }
      if (!config.firebase) {
        fail(res, 503, 'NOT_CONFIGURED', "Sign-in isn't configured yet.");
        return;
      }
      const body = (req.body ?? {}) as { idToken?: unknown; plan?: unknown; inviteCode?: unknown };

      let claims;
      try {
        claims = await verifyIdToken(String(body.idToken ?? ''), {
          projectId: config.firebase.projectId,
          keys,
        });
      } catch (err) {
        if (err instanceof TokenError) {
          fail(res, 401, 'INVALID_TOKEN', 'Your sign-in expired. Please sign in again.');
          return;
        }
        throw err;
      }

      try {
        const result = accounts.signIn(claims, { plan: body.plan, inviteCode: body.inviteCode });
        if (result.needsProvision) void provisioner.provision(result.user);
        const { token } = createSession(db, result.user.id, {
          ip,
          userAgent: req.headers['user-agent'] ?? null,
        });
        db.audit(result.user.id, 'session.created', {
          ip,
          provider: claims.firebase?.sign_in_provider,
        });
        res.setHeader('Set-Cookie', sessionCookie(token, config.cookieSecure));
        res.json({ ok: true });
      } catch (err) {
        if (err instanceof AccountError) {
          fail(res, err.status, err.code, err.message);
          return;
        }
        throw err;
      }
    }),
  );

  // One-time login link minted by `termhive-admin login-link`.
  router.get('/link', (req, res) => {
    const ip = clientIp(req);
    if (!limiter.take(ip)) {
      res.redirect(303, '/login?link=limited');
      return;
    }
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    const userId = token ? db.consumeLoginLink(hashToken(token)) : null;
    const user = userId === null ? undefined : db.userById(userId);
    if (!user || user.status !== 'active') {
      res.redirect(303, '/login?link=expired');
      return;
    }
    const session = createSession(db, user.id, {
      ip,
      userAgent: req.headers['user-agent'] ?? null,
    });
    db.audit(user.id, 'session.created', { ip, provider: 'login-link' });
    res.setHeader('Set-Cookie', sessionCookie(session.token, config.cookieSecure));
    res.redirect(303, '/app');
  });

  router.get('/me', (req, res) => {
    const resolved = resolveSession(db, req);
    if (!resolved) {
      fail(res, 401, 'UNAUTHENTICATED', 'Not signed in.');
      return;
    }
    res.json(accounts.me(resolved.user));
  });

  // Self-serve plan change (no billing yet: paid plans are free in early access).
  router.post(
    '/plan',
    asyncRoute(async (req: Request, res: Response) => {
      const resolved = resolveSession(db, req);
      if (!resolved) {
        fail(res, 401, 'UNAUTHENTICATED', 'Not signed in.');
        return;
      }
      const plan = (req.body as { plan?: unknown } | undefined)?.plan;
      if (!isPlanId(plan)) {
        fail(res, 400, 'INVALID_PLAN', 'Choose free, pro or pro-plus.');
        return;
      }
      const { user } = resolved;
      if (plan !== user.plan) {
        db.setUserPlan(user.id, plan);
        db.audit(user.id, 'user.plan_changed', { from: user.plan, to: plan });
        await provisioner.applyPlan({ ...user, plan });
      }
      res.json(accounts.me({ ...user, plan }));
    }),
  );

  router.get(
    '/usage',
    asyncRoute(async (req: Request, res: Response) => {
      const resolved = resolveSession(db, req);
      if (!resolved) {
        fail(res, 401, 'UNAUTHENTICATED', 'Not signed in.');
        return;
      }
      const ws = db.workspaceByUser(resolved.user.id);
      if (!ws || ws.state !== 'running') {
        fail(res, 409, 'WORKSPACE_NOT_RUNNING', 'Your workspace is not running.');
        return;
      }
      res.json(await workspaceUsage(ws));
    }),
  );

  router.post('/logout-all', (req, res) => {
    const resolved = resolveSession(db, req);
    if (resolved) {
      db.deleteUserSessions(resolved.user.id);
      db.audit(resolved.user.id, 'session.deleted_all', {});
    }
    res.setHeader('Set-Cookie', clearedSessionCookie(config.cookieSecure));
    res.json({ ok: true });
  });

  router.post('/logout', (req, res) => {
    const resolved = resolveSession(db, req);
    if (resolved) {
      db.deleteSession(resolved.tokenHash);
      db.audit(resolved.user.id, 'session.deleted', {});
    }
    res.setHeader('Set-Cookie', clearedSessionCookie(config.cookieSecure));
    res.json({ ok: true });
  });

  return router;
}
