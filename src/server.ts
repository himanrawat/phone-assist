import { buildServer } from './app/build-server.js';
import { env } from './shared/config/env.js';
import { logger } from './shared/logging/logger.js';
import { startWorkers } from './jobs/workers.js';
import { providerConfigService } from './modules/providers/providers.service.js';

const server = await buildServer();

try {
  startWorkers();
  await server.listen({ port: env.PORT, host: env.HOST });
  const globalProviders = providerConfigService.getGlobalConfig();

  logger.info(
    {
      host: env.HOST,
      port: env.PORT,
      telephony: globalProviders.telephony,
      stt: globalProviders.stt,
      tts: globalProviders.tts,
      llm: globalProviders.llm,
    },
    'Server started'
  );
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
