import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let _r2Client: S3Client | null = null;
function getR2Client() {
  if (_r2Client) return _r2Client;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing Cloudflare R2 credentials in environment variables.');
  }

  _r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  return _r2Client;
}

function getBucketName() {
  return process.env.R2_BUCKET_NAME || 'omr-results';
}

function getQuestionBucketName() {
  return process.env.R2_QUESTION_BUCKET_NAME || 'question-bank';
}

/**
 * Uploads an encrypted OMR binary buffer to Cloudflare R2.
 * Uses .bin extension and application/octet-stream to minimize space and overhead.
 * Returns the storage key which will be saved in the Neon Serverless DB.
 */
export async function uploadEncryptedOMRToR2(studentId: string, examId: string, encryptedBuffer: Buffer): Promise<string> {
  // Format: s_{studentId}/e_{examId}.bin
  // Deterministic key prevents orphaned files on upserts
  const storageKey = `s_${studentId}/e_${examId}.bin`;
  
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: storageKey,
    Body: encryptedBuffer,
    ContentType: 'application/octet-stream',
    CacheControl: 'public, max-age=3600, must-revalidate'
  });
  
  await getR2Client().send(command);
  
  return storageKey;
}

/**
 * Downloads an encrypted OMR binary buffer from Cloudflare R2.
 * Used by the student dashboard to fetch encrypted results for client-side decryption.
 */
export async function downloadEncryptedOMRFromR2(storageKey: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: storageKey,
  });

  const response = await getR2Client().send(command);
  const bytes = await response.Body?.transformToByteArray();
  if (!bytes) throw new Error('R2 response body is empty for key: ' + storageKey);
  return Buffer.from(bytes);
}

/**
 * Generates a time-limited presigned GET URL for an encrypted OMR result in R2.
 * The client app uses this URL to download the binary package directly from R2.
 */
export async function getPresignedOMRDownloadUrl(storageKey: string, expiresInSeconds = 900): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: storageKey,
  });

  return getSignedUrl(getR2Client() as any, command as any, { expiresIn: expiresInSeconds });
}

/**
 * Generates a time-limited presigned URL for a question image in R2.
 * The mobile app uses this URL to display the question image securely without
 * exposing the bucket publicly.
 * @param r2StorageKey  The key of the question image inside the question-bank bucket.
 * @param expiresInSeconds  How long the URL is valid (default: 15 minutes).
 */
export async function getPresignedQuestionUrl(r2StorageKey: string, expiresInSeconds = 900): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getQuestionBucketName(),
    Key: r2StorageKey,
  });

  return getSignedUrl(getR2Client() as any, command as any, { expiresIn: expiresInSeconds });
}

/**
 * Uploads notification log payload to Cloudflare R2.
 */
export async function uploadNotificationPayloadToR2(logId: string, payload: any): Promise<string> {
  const storageKey = `notifications/${logId}.json`;
  const body = Buffer.from(JSON.stringify(payload));
  
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: storageKey,
    Body: body,
    ContentType: 'application/json',
    CacheControl: 'public, max-age=86400',
  });
  
  await getR2Client().send(command);
  return storageKey;
}

/**
 * Downloads notification log payload from Cloudflare R2.
 */
export async function downloadNotificationPayloadFromR2(r2PayloadKey: string): Promise<any> {
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: r2PayloadKey,
  });

  const response = await getR2Client().send(command);
  const bytes = await response.Body?.transformToByteArray();
  if (!bytes) throw new Error('R2 response body is empty for key: ' + r2PayloadKey);
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text);
}

