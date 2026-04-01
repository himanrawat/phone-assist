import { Worker, Queue } from 'bullmq';
import { redis } from '../config/redis.js';
import { postCallService } from '../services/call/post-call.service.js';

// ─── Queues ───

export const postCallQueue = new Queue('post-call-processing', {
  connection: redis,
});

// ─── Workers ───

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
    console.log(`Post-call processing completed: ${job.id}`);
  });

  postCallWorker.on('failed', (job, err) => {
    console.error(`Post-call processing failed: ${job?.id}`, err.message);
  });

  console.log('BullMQ workers started');
}
