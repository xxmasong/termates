import { Router, type NextFunction, type Request, type Response } from 'express';

import { describeError } from './services/errors.js';
import type { WorkspaceService } from './services/workspace-service.js';

type Handler = (req: Request, res: Response) => unknown;

/** Run a handler; map domain errors to their HTTP status, pass the rest on. */
const route =
  (handler: Handler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve()
      .then(() => handler(req, res))
      .catch((err: unknown) => {
        const known = describeError(err);
        if (known) res.status(known.status).json(known.body);
        else next(err);
      });
  };

/**
 * REST API — a thin adapter over WorkspaceService. The GraphQL API
 * (graphql/) serves the same service; new clients should prefer it.
 */
export function createRouter(service: WorkspaceService) {
  const router = Router();

  // --- Projects ---
  router.get('/projects', route((_req, res) => res.json(service.listProjects())));
  router.post(
    '/projects',
    route((req, res) => res.status(201).json(service.createProject(req.body ?? {}))),
  );
  router.put(
    '/projects/:id',
    route((req, res) => res.json(service.updateProject(req.params.id, req.body))),
  );
  router.delete(
    '/projects/:id',
    route((req, res) => {
      service.deleteProject(req.params.id, req.query.removeData === 'true');
      res.status(204).end();
    }),
  );

  // --- Agents ---
  router.get(
    '/projects/:id/agents',
    route(async (req, res) => res.json(await service.listAgents(req.params.id))),
  );
  router.get(
    '/projects/:id/agents/previews',
    route(async (req, res) => res.json(await service.previews(req.params.id))),
  );
  router.post(
    '/projects/:id/agents',
    route((req, res) => res.status(201).json(service.createAgent(req.params.id, req.body ?? {}))),
  );
  router.put(
    '/projects/:id/agents/:aid',
    route((req, res) => res.json(service.updateAgent(req.params.id, req.params.aid, req.body))),
  );
  router.delete(
    '/projects/:id/agents/:aid',
    route(async (req, res) => {
      await service.deleteAgent(req.params.id, req.params.aid);
      res.status(204).end();
    }),
  );
  router.get(
    '/projects/:id/agents/:aid/teammates',
    route(async (req, res) => res.json(await service.teammates(req.params.id, req.params.aid))),
  );

  // --- Agent-to-agent messaging (called by the MCP server) ---
  router.post(
    '/projects/:id/messages',
    route(async (req, res) => res.json(await service.sendMessage(req.params.id, req.body ?? {}))),
  );

  // --- Lifecycle ---
  router.post(
    '/projects/:id/agents/:aid/start',
    route(async (req, res) => {
      await service.startAgent(req.params.id, req.params.aid);
      res.json({ status: 'running' });
    }),
  );
  router.post(
    '/projects/:id/agents/:aid/stop',
    route(async (req, res) => {
      await service.stopAgent(req.params.id, req.params.aid);
      res.json({ status: 'stopped' });
    }),
  );
  router.post(
    '/projects/:id/agents/:aid/restart',
    route(async (req, res) => {
      await service.restartAgent(req.params.id, req.params.aid);
      res.json({ status: 'restarting' });
    }),
  );

  // --- Shared Content ---
  router.get('/projects/:id/content', route((req, res) => res.json(service.listContent(req.params.id))));
  router.get(
    '/projects/:id/content/:filename(*)',
    route((req, res) => res.json(service.getContent(req.params.id, req.params.filename))),
  );
  router.post(
    '/projects/:id/content',
    route((req, res) => res.status(201).json(service.createContent(req.params.id, req.body ?? {}))),
  );
  router.put(
    '/projects/:id/content/:filename(*)',
    route((req, res) =>
      res.json(service.updateContent(req.params.id, req.params.filename, req.body?.content)),
    ),
  );
  router.delete(
    '/projects/:id/content/:filename(*)',
    route((req, res) => {
      service.deleteContent(req.params.id, req.params.filename);
      res.status(204).end();
    }),
  );

  // --- Project Wiki ---
  router.get(
    '/projects/:id/wiki/status',
    route((req, res) => res.json({ initialized: service.isWikiInitialized(req.params.id) })),
  );
  router.post(
    '/projects/:id/wiki/initialize',
    route((req, res) => {
      service.initializeWiki(req.params.id);
      res.json({ initialized: true });
    }),
  );
  router.get('/projects/:id/wiki', route((req, res) => res.json(service.listWiki(req.params.id))));
  router.get(
    '/projects/:id/wiki/:filename(*)',
    route((req, res) => res.json(service.getWikiFile(req.params.id, req.params.filename))),
  );
  router.put(
    '/projects/:id/wiki/:filename(*)',
    route((req, res) =>
      res.json(service.updateWikiFile(req.params.id, req.params.filename, req.body?.content)),
    ),
  );

  return router;
}
