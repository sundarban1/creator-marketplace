import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../config/swagger';

export function registerApiDocs(app: Express): void {
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Creator Marketplace API Docs',
    })
  );

  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(swaggerSpec);
  });
}
