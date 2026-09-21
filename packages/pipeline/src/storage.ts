import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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
  constructor(
    private opts: {
      endpoint: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
    },
  ) {}

  async put(_key: string, _bytes: Uint8Array): Promise<void> {
    void this.opts;
    throw new Error("S3Driver is wired at deploy time (aws4fetch) — see docs/06-infrastructure.md");
  }

  async get(_key: string): Promise<Uint8Array | null> {
    throw new Error("S3Driver is wired at deploy time (aws4fetch) — see docs/06-infrastructure.md");
  }

  async exists(_key: string): Promise<boolean> {
    throw new Error("S3Driver is wired at deploy time (aws4fetch) — see docs/06-infrastructure.md");
  }
}

export function storageFromEnv(): StorageDriver {
  const endpoint = process.env.R2_ENDPOINT;
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
