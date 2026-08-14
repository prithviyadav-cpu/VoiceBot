import type { AskRequest, Turn } from './types';

type StreamCallbacks = {
  onDelta: (text: string) => void;
  onDone: (text: string) => void;
  onError: (message: string) => void;
};

type ServerEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; text: string }
  | { type: 'error'; error: string };

/**
 * Posts a question and dispatches the SSE response.
 *
 * Non-streaming failures (missing key, bad request) come back as JSON rather
 * than a stream, so the content type decides how the body is read.
 */
export async function askStream(
  question: string,
  history: Pick<Turn, 'role' | 'text'>[],
  { onDelta, onDone, onError }: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const payload: AskRequest = { question, history };

  let response: Response;
  try {
    response = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return;
    onError('Could not reach the server. Check your connection.');
    return;
  }

  if (!response.ok || !response.body) {
    const message = await readErrorMessage(response);
    onError(message);
    return;
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += value;

      // SSE frames are separated by a blank line.
      let boundary: number;
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        const line = frame.split('\n').find((l) => l.startsWith('data:'));
        if (!line) continue;

        let event: ServerEvent;
        try {
          event = JSON.parse(line.slice(5).trim()) as ServerEvent;
        } catch {
          continue;
        }

        if (event.type === 'delta') onDelta(event.text);
        else if (event.type === 'done') onDone(event.text);
        else if (event.type === 'error') onError(event.error);
      }
    }
  } catch (err) {
    if ((err as Error)?.name !== 'AbortError') {
      onError('The connection dropped while streaming the answer.');
    }
  } finally {
    reader.releaseLock();
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    if (data?.error) return data.error;
  } catch {
    // Body was not JSON; fall through to a status-based message.
  }
  if (response.status === 429) return 'Rate limited. Wait a moment and try again.';
  if (response.status === 503) return 'The server is not configured yet.';
  return `The request failed (${response.status}).`;
}
