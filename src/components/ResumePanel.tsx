'use client';

import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useState, type PointerEvent } from 'react';
import { achievements, identity, projects, skills } from '@/lib/profile';
import type { Project } from '@/lib/profile';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Sends a project-specific question into the conversation. */
  onAsk: (question: string) => void;
};

export function ResumePanel({ open, onClose, onAsk }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-ink-950/80 backdrop-blur-sm"
            aria-hidden
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Profile and experience"
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.985 }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-3 top-[3vh] z-50 mx-auto flex max-h-[94vh] max-w-4xl flex-col sm:inset-x-6"
          >
            <div className="glass glass-edge flex min-h-0 flex-col overflow-hidden">
              <header className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-6 py-5">
                <div>
                  <h2 className="text-lg font-semibold text-gradient">{identity.name}</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {identity.title} · {identity.company}
                  </p>
                  <p className="mt-2 max-w-lg text-xs leading-relaxed text-slate-500">
                    {identity.summary}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close profile"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 transition-colors hover:border-white/20 hover:text-white"
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    className="h-4 w-4"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </header>

              <div className="scroll-subtle perspective-1000 min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-6">
                <section>
                  <SectionLabel>Skills</SectionLabel>
                  <div className="space-y-3">
                    {skills.map((group) => (
                      <div key={group.label}>
                        <p className="mb-1.5 text-xs font-medium text-slate-400">{group.label}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {group.items.map((item) => (
                            <span
                              key={item}
                              className="rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 font-mono text-[0.68rem] text-slate-300"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {groupByOrg(projects).map(([org, items]) => (
                  <section key={org}>
                    <SectionLabel>
                      {org}
                      <span className="ml-2 normal-case tracking-normal text-slate-600">
                        {items[0].period}
                      </span>
                    </SectionLabel>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {items.map((project) => (
                        <TiltCard key={project.id} project={project} onAsk={onAsk} />
                      ))}
                    </div>
                  </section>
                ))}

                <section>
                  <SectionLabel>Competitive programming</SectionLabel>
                  <ul className="space-y-1.5">
                    {achievements.map((line) => (
                      <li key={line} className="flex gap-2 text-xs text-slate-300">
                        <span
                          aria-hidden
                          className="mt-[0.4rem] h-1 w-1 shrink-0 rounded-full bg-aurora-amber"
                        />
                        {line}
                      </li>
                    ))}
                  </ul>
                </section>

                <section>
                  <SectionLabel>Education</SectionLabel>
                  <p className="text-sm text-slate-200">{identity.education.degree}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {identity.education.school} · {identity.education.period} · CGPA{' '}
                    {identity.education.cgpa}
                  </p>
                </section>

                <section className="flex flex-wrap gap-2 border-t border-white/[0.07] pt-5">
                  <ExternalLink href={identity.links.linkedin}>LinkedIn</ExternalLink>
                  <ExternalLink href={identity.links.github}>GitHub</ExternalLink>
                  <ExternalLink href={`mailto:${identity.links.email}`}>Email</ExternalLink>
                </section>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Groups projects under their employer, preserving résumé order (most recent
 * first) rather than sorting alphabetically.
 */
function groupByOrg(items: Project[]): [string, Project[]][] {
  const groups = new Map<string, Project[]>();
  for (const project of items) {
    const existing = groups.get(project.org);
    if (existing) existing.push(project);
    else groups.set(project.org, [project]);
  }
  return [...groups.entries()];
}

/** Project card that tilts toward the pointer for a parallax 3D feel. */
function TiltCard({ project, onAsk }: { project: Project; onAsk: (q: string) => void }) {
  const [hovered, setHovered] = useState(false);

  // -0.5..0.5 pointer offset within the card.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const springConfig = { stiffness: 260, damping: 24 };
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-9, 9]), springConfig);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [7, -7]), springConfig);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - rect.left) / rect.width - 0.5);
    py.set((event.clientY - rect.top) / rect.height - 0.5);
  };

  const resetTilt = () => {
    px.set(0);
    py.set(0);
    setHovered(false);
  };

  return (
    <motion.div
      onPointerMove={handlePointerMove}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={resetTilt}
      style={{ rotateX, rotateY }}
      className="preserve-3d group relative rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-white/[0.015] p-4"
    >
      {/* Glow that follows hover, behind the content. */}
      <motion.div
        aria-hidden
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.28 }}
        className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-aurora-cyan/15 via-aurora-violet/10 to-transparent"
      />

      <div className="relative" style={{ transform: 'translateZ(28px)' }}>
        <h3 className="mb-2 text-sm font-semibold text-slate-100">{project.name}</h3>

        <p className="mb-3 text-xs leading-relaxed text-slate-400">{project.problem}</p>

        <ul className="mb-3 space-y-1">
          {project.impact.map((line) => (
            <li key={line} className="flex gap-1.5 text-xs text-aurora-cyan/90">
              <span aria-hidden className="mt-[0.35rem] h-1 w-1 shrink-0 rounded-full bg-current" />
              {line}
            </li>
          ))}
        </ul>

        <div className="mb-3 flex flex-wrap gap-1">
          {project.stack.map((tech) => (
            <span
              key={tech}
              className="rounded border border-white/[0.07] bg-ink-900/60 px-1.5 py-0.5 font-mono text-[0.6rem] text-slate-400"
            >
              {tech}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onAsk(`Tell me about the ${project.name} project.`)}
          className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-slate-500 transition-colors hover:text-aurora-cyan"
        >
          Ask about this →
        </button>
      </div>
    </motion.div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-slate-500">
      {children}
    </h3>
  );
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-slate-300 transition-colors hover:border-aurora-cyan/40 hover:text-white"
    >
      {children}
    </a>
  );
}
