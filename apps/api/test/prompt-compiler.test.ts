import { describe, it, expect } from 'vitest';
import { compilePrompt, validatePrompt } from '../src/modules/employees/prompt-compiler.js';

/** Hermetic — the compiler is pure, so no services are required. */
describe('prompt compiler', () => {
  const base = {
    name: 'Maya',
    roleTitle: 'Customer Support Lead',
    jobDescription: 'Answer customer emails about orders and refunds. Escalate legal threats.',
  };

  it('opens with the identity line and includes the role section + JD', () => {
    const prompt = compilePrompt(base);
    expect(prompt.startsWith('You are Maya, Customer Support Lead.')).toBe(true);
    expect(prompt).toContain('## Role');
    expect(prompt).toContain(base.jobDescription);
    expect(prompt).toContain('## Guidelines');
  });

  it('is deterministic — same input, same output', () => {
    expect(compilePrompt(base)).toBe(compilePrompt(base));
  });

  it('appends a greeting section only when a welcome message is provided', () => {
    expect(compilePrompt(base)).not.toContain('## Greeting');
    const withWelcome = compilePrompt({ ...base, welcomeMessage: 'Hi there!' });
    expect(withWelcome).toContain('## Greeting');
    expect(withWelcome).toContain('Hi there!');
  });

  it('validates balanced braces and extracts distinct variables', () => {
    const good = validatePrompt('Hello {{customer_name}}, welcome to {{company}}. Bye {{customer_name}}.');
    expect(good.ok).toBe(true);
    expect(good.variables).toEqual(['customer_name', 'company']);

    const bad = validatePrompt('Unbalanced {{oops');
    expect(bad.ok).toBe(false);
    expect(bad.errors.length).toBeGreaterThan(0);
  });
});
