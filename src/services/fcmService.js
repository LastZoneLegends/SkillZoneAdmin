/***
 * FCM Service using Firebase Admin SDK (HTTP v1 API)
 * Uses service account credentials to generate OAuth2 access token
 */

const FCM_PROJECT_ID = import.meta.env.VITE_FCM_PROJECT_ID;
const FCM_CLIENT_EMAIL = import.meta.env.VITE_FCM_CLIENT_EMAIL;
const FCM_PRIVATE_KEY = import.meta.env.VITE_FCM_PRIVATE_KEY?.replace(/\\n/g, '\n');

// Base64URL encode
const base64UrlEncode = (str) => {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

// Convert ArrayBuffer to Base64URL
const arrayBufferToBase64Url = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return base64UrlEncode(binary);
};

// Parse PEM private key to CryptoKey
const importPrivateKey = async (pem) => {
  const pemContents = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
};

// Generate JWT for Google OAuth2
const generateJWT = async () => {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };
  const payload = {
    iss: FCM_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const privateKey = await importPrivateKey(FCM_PRIVATE_KEY);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = arrayBufferToBase64Url(signature);
  return `${signatureInput}.${encodedSignature}`;
};

// Get OAuth2 access token
let cachedToken = null;
let tokenExpiry = 0;

const getAccessToken = async () => {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const jwt = await generateJWT();
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await response.json();
  if (data.access_token) {
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return cachedToken;
  }
  throw new Error(data.error_description || 'Failed to get access token');
};

/**
 * Send push notification via FCM HTTP v1 API
 */
export const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  if (!FCM_PROJECT_ID || !FCM_CLIENT_EMAIL || !FCM_PRIVATE_KEY) {
    console.warn('FCM service account not configured');
    return { success: false, error: 'FCM not configured' };
  }

  try {
    const accessToken = await getAccessToken();

    const message = {
      message: {
        token: fcmToken,
        notification: { title, body },
        data: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)])
        ),
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channel_id: 'default',
          },
        },
        apns: {
          payload: {
            aps: { sound: 'default' },
          },
        },
      },
    };

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      }
    );

    const result = await response.json();

    if (response.ok) {
      return { success: true, messageId: result.name };
    } else {
      return { success: false, error: result.error?.message || 'Failed to send' };
    }
  } catch (error) {
    console.error('FCM Error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send push notification to multiple tokens
 */
export const sendPushToMultipleTokens = async (tokens, title, body, data = {}) => {
  const results = { success: 0, failed: 0, errors: [] };
  
  for (const token of tokens) {
    const result = await sendPushNotification(token, title, body, data);
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push({ token: token.substring(0, 20) + '...', error: result.error });
    }
  }
  
  return results;
};

/**
 * Check if FCM is configured
 */
export const isFcmConfigured = () => {
  return !!(
    FCM_PROJECT_ID && 
    FCM_CLIENT_EMAIL && 
    FCM_PRIVATE_KEY && 
    FCM_PRIVATE_KEY !== '-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n'
  );
};

export default { sendPushNotification, sendPushToMultipleTokens, isFcmConfigured };

