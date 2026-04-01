import type {
  TelephonyProvider,
  CallResponseOptions,
  OutboundCallOptions,
  SmsOptions,
  WebhookValidationRequest,
  MediaStreamConfig,
} from '../../types/providers.js';
import { env } from '../../config/env.js';

export class TwilioProvider implements TelephonyProvider {
  readonly name = 'twilio' as const;

  private get accountSid() { return env.TWILIO_ACCOUNT_SID; }
  private get authToken() { return env.TWILIO_AUTH_TOKEN; }

  private get baseUrl() {
    return `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}`;
  }

  private get authHeader() {
    return 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
  }

  generateCallResponse(options: CallResponseOptions): string {
    const parts: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<Response>'];

    if (options.greeting) {
      parts.push(`  <Say>${escapeXml(options.greeting)}</Say>`);
    }

    // Connect to WebSocket for bidirectional audio streaming
    parts.push('  <Connect>');
    parts.push(`    <Stream url="${escapeXml(options.streamUrl)}">`);
    parts.push('      <Parameter name="encoding" value="audio/x-mulaw" />');
    parts.push('      <Parameter name="sampleRate" value="8000" />');
    parts.push('    </Stream>');
    parts.push('  </Connect>');

    parts.push('</Response>');
    return parts.join('\n');
  }

  async makeCall(options: OutboundCallOptions): Promise<string> {
    const twiml = this.generateCallResponse({
      streamUrl: options.streamUrl,
    });

    const params = new URLSearchParams({
      To: options.to,
      From: options.from,
      Twiml: twiml,
    });

    if (options.statusCallback) {
      params.set('StatusCallback', options.statusCallback);
    }

    const response = await fetch(`${this.baseUrl}/Calls.json`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Twilio makeCall failed: ${error}`);
    }

    const data = (await response.json()) as { sid: string };
    return data.sid;
  }

  async sendSms(options: SmsOptions): Promise<void> {
    const params = new URLSearchParams({
      To: options.to,
      From: options.from,
      Body: options.body,
    });

    const response = await fetch(`${this.baseUrl}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Twilio sendSms failed: ${error}`);
    }
  }

  validateWebhook(_request: WebhookValidationRequest): boolean {
    // TODO: Implement Twilio signature validation
    // For dev, accept all. In production, validate X-Twilio-Signature header.
    if (env.NODE_ENV === 'development') return true;
    return true;
  }

  getMediaStreamConfig(): MediaStreamConfig {
    return {
      audioEvent: 'media',
      encoding: 'mulaw',
      sampleRate: 8000,
    };
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
