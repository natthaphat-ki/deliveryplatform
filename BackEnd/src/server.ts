import { createServer } from 'http';
import { createApp } from './app';
import { createSocketServer } from './sockets/tracking.socket';
import { env } from './config/env';
import { checkDatabaseConnection } from './config/db';

async function bootstrap(): Promise<void> {
  try {
    await checkDatabaseConnection();
    console.log('[backend] MySQL connection established');
  } catch (error) {
    console.error('[backend] failed to connect to MySQL:', error);
    process.exit(1);
  }

  const app = createApp();
  const httpServer = createServer(app);
  createSocketServer(httpServer);

  httpServer.listen(env.port, () => {
    console.log(`[backend] listening on port ${env.port} (${env.nodeEnv})`);
  });
}

bootstrap();
