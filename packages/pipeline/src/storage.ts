import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import path from "node:path";

/**
 * StorageDriver — the only way the pipeline touches bytes.
 * Raw documents are content-addressed by SHA-256 (trust primitive + dedup).
 * Layout mirrors the R2 plan in docs/06: raw/<sha256>/<filename>
 */
export interface StorageDriver {
  put(key: string, bytes: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  exists(key: string): Promise<boolean>;
}

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function rawKey(sha: string, filename: string): string {
  const safe = filename.replace(/[^\w.-]+/g, "_").slice(-80) || "document";
  return `raw/${sha}/${safe}`;
}

export function textKey(sha: string): string {
  return `text/${sha}.txt`;
}

/** Dev driver: mirrors the vault under corpus/vault/ — zero cloud deps. */
export class LocalFsDriver implements StorageDriver {
  constructor(private root = path.resolve("corpus/vault")) {}

  private file(key: string) {
    return path.join(this.root, key);
  }

  async put(key: string, bytes: Uint8Array): Promise<void> {
    const file = this.file(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
  }

  async get(key: string): Promise<Uint8Array | null> {
    try {
      return new Uint8Array(await readFile(this.file(key)));
    } catch {
      return null;
    }
  }

  async exists(key: string): Promise<boolean> {
    return this.get(key).then((b) => b !== null);
  }
}

/** Prod driver: any S3-compatible endpoint (Cloudflare R2). Wired with aws4fetch
 *  at deploy time — same interface, swap by env (see docs/06). */
export class S3Driver implements StorageDriver {
  private readonly client: S3Client;

  constructor(
    private opts: {
      endpoint: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
    },
  ) {
    this.client = new S3Client({
      region: "auto",
      endpoint: opts.endpoint,
      credentials: { accessKeyId: opts.accessKeyId, secretAccessKey: opts.secretAccessKey },
    });
  }

  async put(key: string, bytes: Uint8Array): Promise<void> {
    await this.client.send(new PutObjectCommand({ Bucket: this.opts.bucket, Key: key, Body: bytes }));
  }

  async get(key: string): Promise<Uint8Array | null> {
    try {
      const response = await this.client.send(new GetObjectCommand({ Bucket: this.opts.bucket, Key: key }));
      return response.Body ? new Uint8Array(await response.Body.transformToByteArray()) : null;
    } catch (error) {
      if (error instanceof Error && /NoSuchKey|NotFound|404/i.test(error.name + error.message)) return null;
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.opts.bucket, Key: key }));
      return true;
    } catch (error) {
      if (error instanceof Error && /NotFound|404/i.test(error.name + error.message)) return false;
      throw error;
    }
  }
}

export function storageFromEnv(): StorageDriver {
  const endpoint = process.env.R2_ENDPOINT ?? (process.env.R2_ACCOUNT_ID ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);
  if (endpoint && process.env.R2_BUCKET && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
    return new S3Driver({
      endpoint,
      bucket: process.env.R2_BUCKET,
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    });
  }
  return new LocalFsDriver();
}
