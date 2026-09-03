export function cleanJsonResponse(raw: string): string {
  return raw.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
}

export async function requestDeepSeekJson<T>(
  prompt: string,
  options?: {
    temperature?: number;
    timeoutMs?: number;
  },
): Promise<T | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 25000);
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature ?? 0.3,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = await res.json();
    const raw: string | undefined = data?.choices?.[0]?.message?.content;
    if (!raw) return null;
    return JSON.parse(cleanJsonResponse(raw)) as T;
  } catch {
    return null;
  }
}
