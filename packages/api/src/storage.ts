import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID;
const endpoint = process.env.R2_ENDPOINT ?? (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);
const bucket = process.env.R2_BUCKET;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

const client = endpoint && bucket && accessKeyId && secretAccessKey
  ? new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    })
  : null;

export function isObjectStorageConfigured() {
  return client !== null && bucket !== undefined;
}

export async function presignMediaUpload(input: {
  key: string;
  contentType: string;
  expiresIn?: number;
}) {
  if (!client || !bucket) return null;
  return getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket, Key: input.key, ContentType: input.contentType }),
    { expiresIn: Math.min(input.expiresIn ?? 900, 3600) },
  );
}
