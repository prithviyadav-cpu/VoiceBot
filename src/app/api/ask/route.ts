import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from '@/lib/persona';
import type { AskRequest, Role } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-opus-5';

/** Keep the request bounded: the persona answers in 2-4 sentences. */
const MAX_TOKENS = 1024;

/** Turns of prior context to keep. Pairs, so this is ~8 exchanges. */
const MAX_HISTORY_TURNS = 16;

const MAX_QUESTION_CHARS = 1000;

type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; text: string }
  | { type: 'error'; error: string };

function sse(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Coerces caller-supplied history into a valid alternating message list.
 *
 * The client owns conversation state, so this is untrusted input: entries are
 * shape-checked, empty text dropped, consecutive same-role turns collapsed, and
 * any leading assistant turn removed (the API requires a user turn first).
 */
function normalizeHistory(raw: AskRequest['history']): { role: Role; text: string }[] {
  if (!Array.isArray(raw)) return [];

  const cleaned = raw
    .filter(
      (t): t is { role: Role; text: string } =>
        !!t &&
        (t.role === 'user' || t.role === 'assistant') &&
        typeof t.text === 'string' &&
        t.text.trim().length > 0,
    )
    .map((t) => ({ role: t.role, text: t.text.trim().slice(0, MAX_QUESTION_CHARS) }))
    .slice(-MAX_HISTORY_TURNS);

  const alternating: { role: Role; text: string }[] = [];
  for (const turn of cleaned) {
    if (alternating.length === 0 && turn.role === 'assistant') continue;
    const prev = alternating[alternating.length - 1];
    if (prev && prev.role === turn.role) {
      // Same-role runs are legal on the wire but muddy the transcript; keep the newer text.
      alternating[alternating.length - 1] = turn;
      continue;
    }
    alternating.push(turn);
  }

  // The new question is appended as a user turn, so history must end on assistant.
  if (alternating[alternating.length - 1]?.role === 'user') alternating.pop();

  return alternating;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error:
          'The server is missing ANTHROPIC_API_KEY. Add it in your Vercel project settings (or .env.local for local dev) and redeploy.',
      },
      { status: 503 },
    );
  }

  let body: AskRequest;
  try {
    body = (await req.json()) as AskRequest;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (!question) {
    return Response.json({ error: 'Ask a question first.' }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_CHARS) {
    return Response.json(
      { error: `Questions are limited to ${MAX_QUESTION_CHARS} characters.` },
      { status: 400 },
    );
  }

  const client = new Anthropic({ apiKey });

  const messages: Anthropic.MessageParam[] = [
    ...normalizeHistory(body.history).map(
      (t): Anthropic.MessageParam => ({ role: t.role, content: t.text }),
    ),
    { role: 'user', content: question.slice(0, MAX_QUESTION_CHARS) },
  ];

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => controller.enqueue(encoder.encode(sse(event)));
      let full = '';

      try {
        const run = client.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          // Adaptive thinking with low effort: interview answers are short and
          // conversational, so depth buys latency without buying quality.
          thinking: { type: 'adaptive' },
          output_config: { effort: 'low' },
          system: [
            {
              type: 'text',
              text: SYSTEM_PROMPT,
              // The prompt is byte-stable across requests, so it caches.
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages,
        });

        run.on('text', (delta) => {
          full += delta;
          send({ type: 'delta', text: delta });
        });

        const final = await run.finalMessage();

        if (final.stop_reason === 'refusal') {
          send({
            type: 'error',
            error: 'That question was declined by a safety filter. Try rephrasing it.',
          });
          controller.close();
          return;
        }

        if (!full.trim()) {
          send({ type: 'error', error: 'No answer came back. Please try again.' });
          controller.close();
          return;
        }

        send({ type: 'done', text: full });
        controller.close();
      } catch (err) {
        console.error('[api/ask] generation failed:', err);
        send({ type: 'error', error: describeError(err) });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Vercel/nginx must not buffer the stream or captions arrive all at once.
      'X-Accel-Buffering': 'no',
    },
  });
}

function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return 'The configured ANTHROPIC_API_KEY was rejected. Check that it is valid and active.';
  }
  if (err instanceof Anthropic.RateLimitError) {
    return 'Rate limited by the API. Wait a moment and ask again.';
  }
  if (err instanceof Anthropic.NotFoundError) {
    return `The model "${MODEL}" is not available to this API key.`;
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return 'Could not reach the Anthropic API. Check your network and try again.';
  }
  if (err instanceof Anthropic.APIError) {
    return `The API returned an error (${err.status ?? 'unknown'}). Please try again.`;
  }
  return 'Something went wrong generating the answer. Please try again.';
}
