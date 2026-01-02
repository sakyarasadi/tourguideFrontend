/**
 * Google Cloud Speech-to-Text and Text-to-Speech integration
 * Uses service account credentials for authentication
 */

// Load service account credentials
const sttCredentials = require('../../sublime-lens-479204-m6-ebdbaec1a5a4.json');
const ttsCredentials = require('../../sublime-lens-479204-m6-09694a4cce49.json');

interface SpeechToTextResult {
  transcript: string;
  confidence: number;
}

interface TextToSpeechResult {
  audioContent: string; // base64 encoded audio
}

/**
 * Convert speech audio to text using Google Cloud Speech-to-Text API
 * @param audioBlob - Audio blob from microphone recording
 * @returns Transcript and confidence score
 */
export async function speechToText(audioBlob: Blob): Promise<SpeechToTextResult> {
  try {
    // Convert blob to base64
    const base64Audio = await blobToBase64(audioBlob);
    const audioContent = base64Audio.split(',')[1]; // Remove data:audio/webm;base64, prefix

    // Get access token
    const accessToken = await getAccessToken(sttCredentials);

    // Call Google Cloud Speech-to-Text API
    const response = await fetch(
      'https://speech.googleapis.com/v1/speech:recognize',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            encoding: 'WEBM_OPUS',
            sampleRateHertz: 48000,
            languageCode: 'en-US',
            enableAutomaticPunctuation: true,
          },
          audio: {
            content: audioContent,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Speech-to-Text API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      throw new Error('No speech detected');
    }

    const result = data.results[0];
    const alternative = result.alternatives[0];

    return {
      transcript: alternative.transcript,
      confidence: alternative.confidence || 0,
    };
  } catch (error) {
    console.error('Speech-to-Text error:', error);
    throw error;
  }
}

/**
 * Convert text to speech audio using Google Cloud Text-to-Speech API
 * @param text - Text to convert to speech
 * @returns Base64 encoded audio content
 */
export async function textToSpeech(text: string): Promise<TextToSpeechResult> {
  try {
    // Get access token
    const accessToken = await getAccessToken(ttsCredentials);

    // Call Google Cloud Text-to-Speech API
    const response = await fetch(
      'https://texttospeech.googleapis.com/v1/text:synthesize',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: 'en-US',
            name: 'en-US-Neural2-F', // Female voice
            ssmlGender: 'FEMALE',
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 1.0,
            pitch: 0.0,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Text-to-Speech API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();

    return {
      audioContent: data.audioContent,
    };
  } catch (error) {
    console.error('Text-to-Speech error:', error);
    throw error;
  }
}

/**
 * Play audio from base64 encoded content
 * @param base64Audio - Base64 encoded audio content
 */
export function playAudio(base64Audio: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
      audio.onended = () => resolve();
      audio.onerror = (error) => reject(error);
      audio.play().catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get OAuth2 access token from service account credentials
 * Uses JWT authentication
 */
async function getAccessToken(credentials: any): Promise<string> {
  try {
    // Create JWT
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    // Sign JWT (browser-compatible)
    const token = await signJWT(header, payload, credentials.private_key);

    // Exchange JWT for access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: token,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Token exchange failed: ${error.error_description || response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Failed to get access token:', error);
    throw error;
  }
}

/**
 * Sign JWT using RS256 (browser-compatible using SubtleCrypto)
 */
async function signJWT(header: any, payload: any, privateKey: string): Promise<string> {
  const headerBase64 = base64UrlEncode(JSON.stringify(header));
  const payloadBase64 = base64UrlEncode(JSON.stringify(payload));
  const message = `${headerBase64}.${payloadBase64}`;

  // Import private key
  const key = await importPrivateKey(privateKey);

  // Sign message
  const signature = await crypto.subtle.sign(
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' },
    },
    key,
    new TextEncoder().encode(message)
  );

  const signatureBase64 = base64UrlEncode(arrayBufferToBase64(signature));
  return `${message}.${signatureBase64}`;
}

/**
 * Import RSA private key for signing
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Remove header/footer and newlines
  const pemContents = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  // Decode base64
  const binaryDer = atob(pemContents);
  const binaryArray = new Uint8Array(binaryDer.length);
  for (let i = 0; i < binaryDer.length; i++) {
    binaryArray[i] = binaryDer.charCodeAt(i);
  }

  return await crypto.subtle.importKey(
    'pkcs8',
    binaryArray.buffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' },
    },
    false,
    ['sign']
  );
}

/**
 * Base64 URL encode (RFC 4648)
 */
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
}

/**
 * Convert Blob to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

