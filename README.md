# VoiceBot

An AI interview persona of Prithvi Yadav. Ask a question by voice or text and get a spoken answer grounded in his real projects and experience.

Built with Next.js 15, the Claude API, React Three Fiber, and Framer Motion.

## What it does

- **Voice in, voice out.** Web Speech API dictation drives the question; the answer is streamed back and read aloud with word-synced caption highlighting.
- **A 3D orb that reacts to sound.** A custom GLSL shader displaces an icosphere along its normals using layered simplex noise, driven by live microphone amplitude from an `AnalyserNode`. It shifts palette and behaviour across four states: idle, listening, thinking, speaking.
- **Streaming answers.** Tokens arrive over SSE, so the first words appear in well under a second instead of after the full generation.
- **Conversation memory.** Follow-up questions carry the previous turns, so "tell me more about that" works.
- **Transcript.** Every exchange is logged, scrollable, and exportable as a text file.
- **Shareable answers.** The share button copies a `?q=…` link that re-asks the question on load.
- **Profile panel.** Projects and skills rendered as pointer-tracking 3D tilt cards, each with a one-click "ask about this".
- **Works without a mic.** Text input and suggested-question chips cover browsers with no Web Speech support.

## Setup

Requires Node 20 or newer.

```bash
npm install
cp .env.example .env.local   # then add your key
npm run dev
```

Open http://localhost:3000.

### API key

You need an Anthropic API key from [console.anthropic.com](https://console.anthropic.com/settings/keys). Put it in `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

The app returns a clear in-UI error rather than a blank failure if the key is missing or rejected.

## Deploying to Vercel

1. Push to GitHub and import the repo in Vercel. The framework is detected automatically — no build settings to configure.
2. **Add `ANTHROPIC_API_KEY` under Settings → Environment Variables**, for Production, Preview, and Development.
3. Redeploy.

Step 2 is the one that is easy to miss: environment variables are not read from `.env.local` on Vercel, and a deploy without the key will build fine and then fail on every question.

### Why the previous deployment was broken

The original version had two defects beyond the missing key:

- `server.js` called `app.listen()`. Vercel's Node runtime invokes an exported handler per request; a process that binds a port never serves traffic there. The App Router route handler in `src/app/api/ask/route.ts` replaces it.
- `vercel.json` used the legacy `version: 2` + `builds` format, which bypasses framework detection and fought the static/function routing. It is now a three-line config that just declares the framework.

## Configuration

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | yes | — | Authenticates the Claude API calls |
| `ANTHROPIC_MODEL` | no | `claude-opus-5` | Override the model |

## Editing the persona

[`src/lib/profile.ts`](src/lib/profile.ts) is the single source of truth. Add a project or skill group there and it appears in both the system prompt and the profile panel — no other file needs touching.

[`src/lib/persona.ts`](src/lib/persona.ts) renders that data into Claude's system prompt and holds the answering instructions (first person, 2-4 sentences, no invented facts).

## Layout

```
src/
├── app/
│   ├── api/ask/route.ts    # streaming Claude endpoint (SSE)
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css         # design tokens, glass/gradient utilities
├── components/
│   ├── orb/
│   │   ├── VoiceOrb.tsx    # R3F canvas, per-state animation
│   │   └── shaders.ts      # GLSL vertex + fragment shaders
│   ├── VoiceBot.tsx        # top-level state machine
│   ├── AnswerCard.tsx      # answer + word-synced captions
│   ├── TranscriptPanel.tsx
│   ├── ResumePanel.tsx     # 3D tilt project cards
│   ├── Composer.tsx
│   ├── MicButton.tsx
│   ├── QuestionChips.tsx
│   ├── StatusPill.tsx
│   └── Toasts.tsx
├── hooks/
│   ├── useMicLevel.ts      # Web Audio amplitude, ref-based (no re-render)
│   ├── useSpeechRecognition.ts
│   └── useSpeech.ts        # TTS + caption sync
└── lib/
    ├── profile.ts          # structured profile data
    ├── persona.ts          # system prompt builder
    ├── stream.ts           # client-side SSE reader
    ├── types.ts
    └── speech.d.ts         # Web Speech API types
```

## Browser support

Speech recognition needs Chrome, Edge, or Safari — Firefox has not shipped it. Everything else, including text input and the 3D orb, works everywhere WebGL does. The app detects the gap and points you at the text box rather than failing silently.

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm start          # serve the build
npm run typecheck  # tsc --noEmit
```
