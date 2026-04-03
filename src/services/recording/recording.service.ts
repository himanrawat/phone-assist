import { env } from '../../config/env.js';
import { db } from '../../config/database.js';
import { calls } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { createHmac, createHash } from 'node:crypto';

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
  if (env.NODE_ENV === 'development') {
    return null;
  }

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

    const rawMulawBuffer = Buffer.concat(
      audioChunks.map((chunk) => Buffer.from(chunk, 'base64'))
    );
    const recordingBuffer = buildWavRecordingFromMulaw(rawMulawBuffer);

    const key = `recordings/${tenantId}/${callId}.wav`;
    const r2Config = getR2Config();

    if (r2Config) {
      try {
        await this.uploadToR2(r2Config, key, recordingBuffer);
      } catch (err) {
        if (env.NODE_ENV !== 'development') {
          throw err;
        }

        console.warn(`Falling back to local recording save for ${callId}:`, err);
        await this.saveLocally(key, recordingBuffer);
      }
    } else {
      // Local fallback for development
      await this.saveLocally(key, recordingBuffer);
    }

    // Update call record with recording info
    await db
      .update(calls)
      .set({
        recordingKey: key,
        recordingUrl: `/api/v1/calls/${callId}/recording`,
      })
      .where(eq(calls.id, callId));

    return key;
  },

  async uploadToR2(config: R2Config, key: string, data: Buffer): Promise<void> {
    const signedRequest = createSignedR2Request(config, key, 'PUT', data, 'audio/wav');
    const response = await fetch(signedRequest.url, {
      method: 'PUT',
      headers: signedRequest.headers,
      body: data,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`R2 upload failed: ${response.status} ${errorBody}`.trim());
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

  async getRecordingData(key: string): Promise<Buffer | null> {
    const r2Config = getR2Config();

    if (r2Config) {
      try {
        const signedRequest = createSignedR2Request(r2Config, key, 'GET');
        const response = await fetch(signedRequest.url, {
          method: 'GET',
          headers: signedRequest.headers,
        });

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          return Buffer.from(arrayBuffer);
        }

        if (response.status !== 404 && env.NODE_ENV !== 'development') {
          throw new Error(`R2 download failed: ${response.status}`);
        }

        if (response.status !== 404) {
          console.warn(`Falling back to local recording read for ${key}: ${response.status}`);
        }
      } catch (err) {
        if (env.NODE_ENV !== 'development') {
          throw err;
        }

        console.warn(`Falling back to local recording read for ${key}:`, err);
      }
    }

    return this.readLocally(key);
  },

  async readLocally(key: string): Promise<Buffer | null> {
    const fs = await import('fs/promises');
    const path = await import('path');

    try {
      const filePath = path.join(process.cwd(), 'storage', key);
      return await fs.readFile(filePath);
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === 'ENOENT') {
        return null;
      }

      throw err;
    }
  },
};

function buildWavRecordingFromMulaw(rawMulaw: Buffer): Buffer {
  const pcmBuffer = Buffer.alloc(rawMulaw.length * 2);

  for (let i = 0; i < rawMulaw.length; i += 1) {
    pcmBuffer.writeInt16LE(mulawToLinear16(rawMulaw[i] ?? 0), i * 2);
  }

  return createPcmWaveFile(pcmBuffer, 8000, 1, 16);
}

function createPcmWaveFile(audioData: Buffer, sampleRate: number, channels: number, bitsPerSample: number): Buffer {
  const byteRate = sampleRate * channels * bitsPerSample / 8;
  const blockAlign = channels * bitsPerSample / 8;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + audioData.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(audioData.length, 40);

  return Buffer.concat([header, audioData]);
}

function mulawToLinear16(value: number): number {
  const mulaw = (~value) & 0xff;
  const sign = mulaw & 0x80;
  const exponent = (mulaw >> 4) & 0x07;
  const mantissa = mulaw & 0x0f;
  const magnitude = ((mantissa << 3) + 0x84) << exponent;
  const sample = magnitude - 0x84;

  return sign ? -sample : sample;
}

function createSignedR2Request(
  config: R2Config,
  key: string,
  method: 'GET' | 'PUT',
  body?: Buffer,
  contentType?: string
) {
  const url = new URL(`${config.endpoint}/${config.bucket}/${key}`);
  const amzDate = formatAmzDate(new Date());
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body || Buffer.alloc(0));
  const canonicalUri = url.pathname
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
    .replace(/%2F/g, '/');

  const canonicalHeadersList: Array<[string, string]> = [
    ['host', url.host],
    ['x-amz-content-sha256', payloadHash],
    ['x-amz-date', amzDate],
  ];

  if (contentType) {
    canonicalHeadersList.push(['content-type', contentType]);
  }

  const canonicalHeaders = canonicalHeadersList
    .map(([header, value]) => `${header}:${value.trim()}\n`)
    .join('');
  const signedHeaders = canonicalHeadersList
    .map(([header]) => header)
    .join(';');

  const canonicalRequest = [
    method,
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(Buffer.from(canonicalRequest, 'utf8')),
  ].join('\n');

  const signingKey = getSignatureKey(config.secretAccessKey, dateStamp, 'auto', 's3');
  const signature = createHmac('sha256', signingKey)
    .update(stringToSign)
    .digest('hex');

  const headers: Record<string, string> = {
    Authorization: [
      `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}`,
      `SignedHeaders=${signedHeaders}`,
      `Signature=${signature}`,
    ].join(', '),
    Host: url.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };

  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  return {
    url: url.toString(),
    headers,
  };
}

function formatAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function sha256Hex(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

function getSignatureKey(secretAccessKey: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = createHmac('sha256', `AWS4${secretAccessKey}`).update(dateStamp).digest();
  const kRegion = createHmac('sha256', kDate).update(region).digest();
  const kService = createHmac('sha256', kRegion).update(service).digest();
  return createHmac('sha256', kService).update('aws4_request').digest();
}
