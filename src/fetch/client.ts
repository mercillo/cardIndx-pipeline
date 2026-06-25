const SLEEP_MS = 300;
const RETRY_DELAYS = [5000, 10000, 20000]; // backoff on 429

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchWithDelay<T>(
  url: string,
  headers: HeadersInit = {},
): Promise<T> {
  await sleep(SLEEP_MS);

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    const response = await fetch(url, { headers });

    if (response.status === 429) {
      if (attempt < RETRY_DELAYS.length) {
        const wait = RETRY_DELAYS[attempt];
        console.warn(`   ⏳ Rate limited — retrying in ${wait / 1000}s...`);
        await sleep(wait);
        continue;
      }
      throw new Error(`Rate limited after ${attempt} retries: ${url}`);
    }

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} for ${url}`);
    }

    return response.json() as Promise<T>;
  }

  throw new Error(`Failed after retries: ${url}`);
}
