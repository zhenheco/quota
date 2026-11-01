import { describe, expect, it } from 'vitest';
import qaGateWorkflow from '../.github/workflows/qa-gate.yml?raw';

// Tests run in workerd (no real fs), so enumerate files via Vite globs.
const workflows = import.meta.glob('../.github/workflows/*.yml', { query: '?raw', import: 'default', eager: true });
const scripts = import.meta.glob('../.github/scripts/*', { query: '?raw', import: 'default', eager: true });

describe('agent automerge gates', () => {
  it('publishes an automerge-gate workflow over the repo test/build contract', () => {
    expect(qaGateWorkflow).toContain('name: QA Gate');
    expect(qaGateWorkflow).toContain('pull_request:');
    expect(qaGateWorkflow).toContain('branches: [main]');
    expect(qaGateWorkflow).toContain('merge_group:');
    expect(qaGateWorkflow).toContain('name: automerge-gate');
    expect(qaGateWorkflow).toContain('pnpm install --frozen-lockfile');
    expect(qaGateWorkflow).toContain('pnpm test');
    expect(qaGateWorkflow).toContain('pnpm build');
    expect(qaGateWorkflow).toContain('pnpm --dir packages/mcp install --frozen-lockfile');
    expect(qaGateWorkflow).toContain('pnpm --dir packages/mcp test');
    expect(qaGateWorkflow).toContain('pnpm --dir packages/mcp build');
    expect(qaGateWorkflow.indexOf('pnpm --dir packages/mcp install --frozen-lockfile')).toBeLessThan(
      qaGateWorkflow.indexOf('pnpm build')
    );
  });

  it('has no API-based diff-review workflow and no workflow uses its API keys', () => {
    expect(Object.keys(workflows).filter((path) => path.includes('diff-review'))).toEqual([]);
    expect(Object.keys(scripts).filter((path) => path.includes('diff_review'))).toEqual([]);
    for (const [path, text] of Object.entries(workflows)) {
      expect(text, path).not.toMatch(/DEEPSEEK_API_KEY|GEMINI_API_KEY/);
    }
  });
});
