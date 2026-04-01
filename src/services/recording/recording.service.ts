import { env } from '../../config/env.js';
import { db } from '../../config/database.js';
import { calls } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Recording service — saves call recordings to Cloudflare R2 (S3-compatible).
 * Falls back to local filesystem in development if R2 is not configured.
 */

interface R2Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

function getR2Config(): R2Config | null {
  if (!env.R2_ENDPOINT || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    return null;
  }
  return {
    endpoint: env.R2_ENDPOINT,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucket: env.R2_BUCKET_NAME,
  };
}

export const recordingService = {
  /**
   * Save call recording audio to R2 (or local in dev).
   * Returns the storage key for later retrieval.
   */
  async saveRecording(
    callId: string,
    tenantId: string,
    audioChunks: string[] // base64-encoded audio chunks
  ): Promise<string | null> {
    if (audioChunks.length === 0) return null;

    // Combine all audio chunks into a single buffer
    const audioBuffer = Buffer.concat(
      audioChunks.map((chunk) => Buffer.from(chunk, 'base64'))
    );

    const key = `recordings/${tenantId}/${callId}.wav`;
    const r2Config = getR2Config();

    if (r2Config) {
      await this.uploadToR2(r2Config, key, audioBuffer);
    } else {
      // Local fallback for development
      await this.saveLocally(key, audioBuffer);
    }

    // Update call record with recording info
    await db
      .update(calls)
      .set({
        recordingKey: key,
        recordingUrl: r2Config
          ? `${r2Config.endpoint}/${r2Config.bucket}/${key}`
          : `/recordings/${key}`,
      })
      .where(eq(calls.id, callId));

    return key;
  },

  async uploadToR2(config: R2Config, key: string, data: Buffer): Promise<void> {
    // S3-compatible PUT request to Cloudflare R2
    const url = `${config.endpoint}/${config.bucket}/${key}`;

    // Using simple PUT with auth header
    // For production, use AWS SDK v3 with S3Client for proper signing
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'audio/wav',
        'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
      },
      body: data,
    });

    if (!response.ok) {
      throw new Error(`R2 upload failed: ${response.status}`);
    }

    console.log(`Recording uploaded to R2: ${key}`);
  },

  async saveLocally(key: string, data: Buffer): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const filePath = path.join(process.cwd(), 'storage', key);
    const dir = path.dirname(filePath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, data);

    console.log(`Recording saved locally: ${filePath}`);
  },

  /**
   * Get a recording's download URL or local path.
   */
  async getRecordingUrl(callId: string): Promise<string | null> {
    const [call] = await db
      .select({ recordingUrl: calls.recordingUrl })
      .from(calls)
      .where(eq(calls.id, callId))
      .limit(1);

    return call?.recordingUrl || null;
  },
};
