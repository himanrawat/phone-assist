import { Queue, Worker } from 'bullmq';
import { redis } from '../shared/config/redis.js';
import { logger } from '../shared/logging/logger.js';
import { postCallService } from '../modules/calls/post-call.service.js';

export const postCallQueue = new Queue('post-call-processing', {
  connection: redis,
});

export function startWorkers() {
  const postCallWorker = new Worker(
    'post-call-processing',
    async (job) => {
      const { callId } = job.data as { callId: string };
      await postCallService.process(callId);
    },
    {
      connection: redis,
      concurrency: 5,
    }
  );

  postCallWorker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Post-call processing completed');
  });

  postCallWorker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id }, 'Post-call processing failed');
  });

  logger.info('BullMQ workers started');
}
