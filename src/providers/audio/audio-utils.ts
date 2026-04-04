const WAV_FORMAT_PCM = 1;
const PCM16_BITS_PER_SAMPLE = 16;
const PCM16_BYTES_PER_SAMPLE = PCM16_BITS_PER_SAMPLE / 8;
const MULAW_BIAS = 0x84;

export interface AudioFormatOptions {
  encoding?: string;
  sampleRate?: number;
}

export interface AudioActivity {
  durationMs: number;
  averageAmplitude: number;
  peakAmplitude: number;
  isSpeech: boolean;
}

export function toPcm16Buffer(
  audioBuffer: Buffer,
  options: AudioFormatOptions = {}
): Buffer {
  const encoding = normalizeAudioEncoding(options.encoding);

  switch (encoding) {
    case 'mulaw':
      return mulawBufferToPcm16(audioBuffer);
    case 'linear16':
      return audioBuffer;
    default:
      throw new Error(`Unsupported inbound audio encoding: ${options.encoding || 'unknown'}`);
  }
}

export function wrapAudioInWave(
  audioBuffer: Buffer,
  options: AudioFormatOptions = {}
): Buffer {
  const sampleRate = options.sampleRate || 8000;
  const pcm16Buffer = toPcm16Buffer(audioBuffer, options);
  return createPcm16WaveFile(pcm16Buffer, sampleRate, 1);
}

export function detectSpeechActivity(
  audioBuffer: Buffer,
  options: AudioFormatOptions = {}
): AudioActivity {
  const sampleRate = options.sampleRate || 8000;
  const pcm16Buffer = toPcm16Buffer(audioBuffer, options);
  const sampleCount = Math.max(0, Math.floor(pcm16Buffer.length / PCM16_BYTES_PER_SAMPLE));

  if (sampleCount === 0) {
    return {
      durationMs: 0,
      averageAmplitude: 0,
      peakAmplitude: 0,
      isSpeech: false,
    };
  }

  let amplitudeTotal = 0;
  let peakAmplitude = 0;

  for (let offset = 0; offset < pcm16Buffer.length; offset += PCM16_BYTES_PER_SAMPLE) {
    const amplitude = Math.abs(pcm16Buffer.readInt16LE(offset));
    amplitudeTotal += amplitude;

    if (amplitude > peakAmplitude) {
      peakAmplitude = amplitude;
    }
  }

  const averageAmplitude = amplitudeTotal / sampleCount;
  const durationMs = Math.round((sampleCount / sampleRate) * 1000);
  const isSpeech = averageAmplitude >= 900 || peakAmplitude >= 3500;

  return {
    durationMs,
    averageAmplitude,
    peakAmplitude,
    isSpeech,
  };
}

function normalizeAudioEncoding(encoding?: string): 'mulaw' | 'linear16' {
  switch ((encoding || 'mulaw').trim().toLowerCase()) {
    case 'mulaw':
    case 'mu-law':
    case 'audio/x-mulaw':
    case 'g711_ulaw':
      return 'mulaw';
    case 'linear16':
    case 'pcm16':
    case 'audio/l16':
      return 'linear16';
    default:
      return 'mulaw';
  }
}

function mulawBufferToPcm16(audioBuffer: Buffer): Buffer {
  const output = Buffer.alloc(audioBuffer.length * PCM16_BYTES_PER_SAMPLE);

  for (let index = 0; index < audioBuffer.length; index += 1) {
    output.writeInt16LE(
      mulawToLinear16(audioBuffer.readUInt8(index)),
      index * PCM16_BYTES_PER_SAMPLE
    );
  }

  return output;
}

function mulawToLinear16(value: number): number {
  const normalized = ~value & 0xff;
  const sign = normalized & 0x80;
  const exponent = (normalized >> 4) & 0x07;
  const mantissa = normalized & 0x0f;
  const magnitude = ((mantissa << 3) + MULAW_BIAS) << exponent;
  const sample = magnitude - MULAW_BIAS;

  return sign ? -sample : sample;
}

function createPcm16WaveFile(
  audioData: Buffer,
  sampleRate: number,
  channels: number
): Buffer {
  const blockAlign = channels * PCM16_BYTES_PER_SAMPLE;
  const byteRate = sampleRate * blockAlign;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + audioData.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(WAV_FORMAT_PCM, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(PCM16_BITS_PER_SAMPLE, 34);
  header.write('data', 36);
  header.writeUInt32LE(audioData.length, 40);

  return Buffer.concat([header, audioData]);
}
