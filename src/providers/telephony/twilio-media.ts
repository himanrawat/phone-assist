const TWILIO_MULAW_SAMPLE_RATE = 8000;
const TWILIO_MULAW_FRAME_BYTES = 160;
const WAV_FORMAT_PCM = 1;
const WAV_FORMAT_MULAW = 7;
const MULAW_BIAS = 0x84;
const MULAW_CLIP = 32635;

export const TWILIO_TTS_OPTIONS = {
  responseFormat: 'wav' as const,
};

interface WavFormatChunk {
  audioFormat: number;
  channels: number;
  sampleRate: number;
  bitsPerSample: number;
}

export function createTwilioMediaMessages(streamSid: string, audioBuffer: Buffer): string[] {
  const payloadBuffer = normalizeTwilioOutboundAudio(audioBuffer);
  const messages: string[] = [];

  for (let offset = 0; offset < payloadBuffer.length; offset += TWILIO_MULAW_FRAME_BYTES) {
    const payload = payloadBuffer
      .subarray(offset, Math.min(offset + TWILIO_MULAW_FRAME_BYTES, payloadBuffer.length))
      .toString('base64');

    messages.push(JSON.stringify({
      event: 'media',
      streamSid,
      media: { payload },
    }));
  }

  if (messages.length === 0) {
    messages.push(JSON.stringify({
      event: 'media',
      streamSid,
      media: { payload: '' },
    }));
  }

  return messages;
}

export function createTwilioMarkMessage(streamSid: string, name: string): string {
  return JSON.stringify({
    event: 'mark',
    streamSid,
    mark: { name },
  });
}

export function createTwilioClearMessage(streamSid: string): string {
  return JSON.stringify({
    event: 'clear',
    streamSid,
  });
}

export function createTwilioPlaybackMarkName(callId: string, counter: number): string {
  return `${callId}:playback:${counter}`;
}

function normalizeTwilioOutboundAudio(audioBuffer: Buffer): Buffer {
  if (!isWaveBuffer(audioBuffer)) {
    return audioBuffer;
  }

  const { format, audioData } = parseWaveBuffer(audioBuffer);

  if (format.channels !== 1) {
    throw new Error(`Twilio outbound audio must be mono, received ${format.channels} channels`);
  }

  if (format.audioFormat === WAV_FORMAT_MULAW) {
    if (format.sampleRate === TWILIO_MULAW_SAMPLE_RATE) {
      return audioData;
    }

    throw new Error(
      `Unsupported mu-law WAV sample rate ${format.sampleRate}; expected ${TWILIO_MULAW_SAMPLE_RATE}`
    );
  }

  if (format.audioFormat === WAV_FORMAT_PCM && format.bitsPerSample === 16) {
    const pcm16Audio = format.sampleRate === TWILIO_MULAW_SAMPLE_RATE
      ? audioData
      : resamplePcm16(audioData, format.sampleRate, TWILIO_MULAW_SAMPLE_RATE);

    return pcm16ToMulaw(pcm16Audio);
  }

  throw new Error(
    `Unsupported WAV format ${format.audioFormat} (${format.bitsPerSample}-bit) for Twilio outbound audio`
  );
}

function isWaveBuffer(audioBuffer: Buffer): boolean {
  return audioBuffer.length >= 12
    && audioBuffer.toString('ascii', 0, 4) === 'RIFF'
    && audioBuffer.toString('ascii', 8, 12) === 'WAVE';
}

function parseWaveBuffer(audioBuffer: Buffer): { format: WavFormatChunk; audioData: Buffer } {
  let format: WavFormatChunk | null = null;
  let audioData: Buffer | null = null;
  let offset = 12;

  while (offset + 8 <= audioBuffer.length) {
    const chunkId = audioBuffer.toString('ascii', offset, offset + 4);
    const chunkSize = audioBuffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    let chunkEnd = chunkStart + chunkSize;

    // Some encoders use 0xFFFFFFFF for the RIFF/data length when the final size
    // is not known up front. Treat the payload as running to EOF in that case.
    if (chunkId === 'data' && (chunkSize === 0xffffffff || chunkEnd > audioBuffer.length)) {
      chunkEnd = audioBuffer.length;
    }

    if (chunkEnd > audioBuffer.length) {
      break;
    }

    if (chunkId === 'fmt ' && chunkSize >= 16) {
      format = {
        audioFormat: audioBuffer.readUInt16LE(chunkStart),
        channels: audioBuffer.readUInt16LE(chunkStart + 2),
        sampleRate: audioBuffer.readUInt32LE(chunkStart + 4),
        bitsPerSample: audioBuffer.readUInt16LE(chunkStart + 14),
      };
    }

    if (chunkId === 'data') {
      audioData = audioBuffer.subarray(chunkStart, chunkEnd);
    }

    offset = chunkEnd + (chunkSize % 2);
  }

  if (!format || !audioData) {
    throw new Error('Invalid WAV payload: missing fmt or data chunk');
  }

  return { format, audioData };
}

function pcm16ToMulaw(audioBuffer: Buffer): Buffer {
  const sampleCount = Math.floor(audioBuffer.length / 2);
  const output = Buffer.alloc(sampleCount);

  for (let i = 0; i < sampleCount; i += 1) {
    output[i] = linear16ToMulaw(audioBuffer.readInt16LE(i * 2));
  }

  return output;
}

function resamplePcm16(audioBuffer: Buffer, inputSampleRate: number, outputSampleRate: number): Buffer {
  if (inputSampleRate <= 0 || outputSampleRate <= 0) {
    throw new Error(`Invalid sample rate conversion ${inputSampleRate} -> ${outputSampleRate}`);
  }

  if (inputSampleRate === outputSampleRate) {
    return audioBuffer;
  }

  const inputSamples = Math.floor(audioBuffer.length / 2);
  if (inputSamples === 0) {
    return Buffer.alloc(0);
  }

  const outputSamples = Math.max(1, Math.round(inputSamples * outputSampleRate / inputSampleRate));
  const outputBuffer = Buffer.alloc(outputSamples * 2);
  const maxInputIndex = inputSamples - 1;

  for (let i = 0; i < outputSamples; i += 1) {
    const sourceIndex = i * inputSampleRate / outputSampleRate;
    const leftIndex = Math.min(Math.floor(sourceIndex), maxInputIndex);
    const rightIndex = Math.min(leftIndex + 1, maxInputIndex);
    const fraction = sourceIndex - leftIndex;

    const leftSample = audioBuffer.readInt16LE(leftIndex * 2);
    const rightSample = audioBuffer.readInt16LE(rightIndex * 2);
    const interpolatedSample = Math.round(leftSample + ((rightSample - leftSample) * fraction));

    outputBuffer.writeInt16LE(interpolatedSample, i * 2);
  }

  return outputBuffer;
}

function linear16ToMulaw(sample: number): number {
  let pcm = sample;
  const sign = pcm < 0 ? 0x80 : 0x00;

  if (pcm < 0) {
    pcm = -pcm;
  }

  if (pcm > MULAW_CLIP) {
    pcm = MULAW_CLIP;
  }

  pcm += MULAW_BIAS;

  let exponent = 7;
  for (let expMask = 0x4000; exponent > 0 && (pcm & expMask) === 0; expMask >>= 1) {
    exponent -= 1;
  }

  const mantissa = (pcm >> (exponent + 3)) & 0x0f;
  return ~(sign | (exponent << 4) | mantissa) & 0xff;
}
