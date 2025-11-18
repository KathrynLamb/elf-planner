// src/lib/elfImageStore.ts
import { randomUUID } from 'crypto';
import { redis } from '@/lib/elfStore';

const KEY_PREFIX = 'elf:image:';
// 60 days in seconds
const TTL_SECONDS = 60 * 60 * 24 * 60;

function getBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) {
    throw new Error(
      'NEXT_PUBLIC_APP_URL is not set. Please set it to your app base URL, e.g. https://elfontheshelf.uk',
    );
  }
  return raw.replace(/\/+$/, '');
}

export async function saveElfImageFromBase64(b64: string): Promise<string> {
  const id = randomUUID();
  const key = `${KEY_PREFIX}${id}`;
  // store the base64 string itself
  await redis.set(key, b64, { ex: TTL_SECONDS });
  const baseUrl = getBaseUrl();
  return `${baseUrl}/api/elf-image/${id}`;
}

export async function getElfImageBase64(id: string): Promise<string | null> {
  const key = `${KEY_PREFIX}${id}`;
  return (await redis.get(key)) as string | null;
}
