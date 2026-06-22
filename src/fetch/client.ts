/**
 * API Client with Throttling
 * Prevents IP bans by forcing a delay between requests.
 */

const SLEEP_MS = 300; // 300ms delay between calls

export async function fetchWithDelay<T>(
  url: string,
  headers: HeadersInit = {},
): Promise<T> {
  // 1. Wait for the delay
  await new Promise((resolve) => setTimeout(resolve, SLEEP_MS));

  // 2. Perform the fetch
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} for ${url}`);
  }

  return response.json() as Promise<T>;
}
