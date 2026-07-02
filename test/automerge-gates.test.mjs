import { describe, expect, it } from 'vitest';
import diffReviewScript from '../.github/scripts/diff_review.py?raw';
import diffReviewWorkflow from '../.github/workflows/diff-review.yml?raw';
import qaGateWorkflow from '../.github/workflows/qa-gate.yml?raw';

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

  it('publishes a fail-closed diff-review verdict status for target PRs', () => {
    expect(diffReviewWorkflow).toContain('pull_request_target:');
    expect(diffReviewWorkflow).toContain('statuses: write');
    expect(diffReviewWorkflow).toContain('context=diff-review-verdict');
    expect(diffReviewWorkflow).toContain('gh pr diff "$PR_NUMBER"');
    expect(diffReviewWorkflow).toContain('python3 .github/scripts/diff_review.py review');
    expect(diffReviewScript).toContain('def review_diff(');
    expect(diffReviewScript).toContain('return "fail"');
    expect(diffReviewScript).toContain('redact_secrets');
  });
});
