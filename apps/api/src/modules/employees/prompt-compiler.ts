/**
 * Deterministic job-description → system-prompt compiler.
 *
 * No LLM call: the same inputs always produce the same prompt, which keeps
 * version history meaningful and tests hermetic. The richer, model-assisted
 * compiler can replace this later without changing the call sites.
 *
 * Template variables: authors may embed `{{placeholder}}` tokens in the job
 * description (e.g. a company name). They are passed through verbatim so the
 * runtime can interpolate them per conversation; `validatePrompt` reports any
 * malformed braces so the UI can warn before saving.
 */

export interface CompileInput {
  name: string;
  roleTitle: string;
  jobDescription: string;
  welcomeMessage?: string | null;
}

export function compilePrompt(input: CompileInput): string {
  const { name, roleTitle, jobDescription, welcomeMessage } = input;

  const sections: string[] = [
    `You are ${name}, ${roleTitle}.`,
    `## Role\n${jobDescription.trim()}`,
    [
      '## Guidelines',
      '- Be accurate, concise, and genuinely helpful.',
      '- Stay within the responsibilities above. If a request falls outside your role',
      "  or you're unsure, say so plainly and hand off to a human.",
      '- Never invent policies, prices, or commitments. Verify before you state facts.',
      '- Ask at most one clarifying question before acting.',
    ].join('\n'),
  ];

  if (welcomeMessage && welcomeMessage.trim()) {
    sections.push(`## Greeting\nOpen new conversations with: "${welcomeMessage.trim()}"`);
  }

  return sections.join('\n\n');
}

export interface PromptValidation {
  ok: boolean;
  /** Distinct `{{variable}}` names found, in first-seen order. */
  variables: string[];
  errors: string[];
}

const VARIABLE_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

/** Structural validation of a prompt template: balanced braces + variable list. */
export function validatePrompt(text: string): PromptValidation {
  const errors: string[] = [];
  const opens = (text.match(/\{\{/g) ?? []).length;
  const closes = (text.match(/\}\}/g) ?? []).length;
  if (opens !== closes) {
    errors.push('Unbalanced template braces — every {{ needs a matching }}.');
  }

  const variables: string[] = [];
  for (const match of text.matchAll(VARIABLE_RE)) {
    const name = match[1]!;
    if (!variables.includes(name)) variables.push(name);
  }

  return { ok: errors.length === 0, variables, errors };
}
