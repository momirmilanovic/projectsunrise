---
name: git-pr
description: "Stage this repo's real changes (never git add -A/.), commit with a message describing what changed and why, push, and open a PR against main. Use when the user asks to ship, commit and push, or open a PR for the current work in this repo."
user-invocable: true
---

# Git PR

Stage, commit, push, and open a pull request for the current changes in this repo, end to
end, in one pass — invoking this skill is itself the explicit request to commit and push, so
there is no second confirmation gate between commit and push/PR. The diff and commit message
are shown for visibility on the way through, not as a stop-and-wait.

## Steps

### 1. Survey the current state

```bash
git status
git diff
git diff --cached
git branch --show-current
git log --oneline -8
```

Understand: what's staged, what's unstaged, what's untracked, which branch you're on, and
this repo's recent commit-message style and attribution convention (read a few real messages
from `git log`, don't guess).

### 2. Decide what to stage — never blindly

**Never run `git add .` or `git add -A`.** Instead:

- Review every untracked and modified path from `git status` individually.
- Stage only files that are real project work: source, tests, docs, config intended for the
  repo.
- Exclude by default — and call out explicitly if seen — anything matching: `.env` /
  `*.env.local` / credential or secret-looking files, `node_modules/`, build output, database
  files (`*.db`, `*.db-shm`, `*.db-wal`), log/cache directories, IDE scratch files, and
  anything that looks generated rather than authored even if untracked.
- If a file is ambiguous — unrecognized, binary, or its name/content suggests
  "secret"/"key"/"token"/"password" — stop and ask the user before staging it.
- Stage with explicit paths: `git add <path> <path> ...`.

### 3. Show what's about to be committed

```bash
git status
git diff --cached
```

Present this to the user before drafting the message. If the staged diff contains anything
unexpected or suspicious, stop and ask before continuing — otherwise proceed straight through.

### 4. Draft the commit message

Follow this repo's own commit-message convention, observed from `git log` in step 1: concise
(1-2 sentences), focused on *why* the change was made, not a mechanical list of touched files.

Respect the repo's scoping rule (`CLAUDE.md` §7 — "Keep commits scoped to one module or one
concern"): if the staged changes clearly span unrelated concerns, say so and either split into
separate commits or ask the user how to proceed, rather than bundling them under one message
that will mislead readers later.

Use a heredoc so formatting survives:

```bash
git commit -m "$(cat <<'EOF'
<concise summary of the why>

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

### 5. Push

Check whether the current branch already tracks a remote branch:

```bash
git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>&1
```

- If it does: `git push`.
- If it doesn't: `git push -u origin $(git branch --show-current)`.

Never force-push. Never push straight to `main`/`master` — if the current branch is
`main`/`master`, stop and ask whether to create a feature branch first instead of pushing
directly.

### 6. Open the PR

Base the PR description on **every** commit that will be included (`git log
main...HEAD` and `git diff main...HEAD`), not just the commit just made — if the branch
already had earlier commits before this skill ran, the PR must describe all of them, not only
the latest one.

```bash
gh pr create --title "<short imperative title, under 70 chars>" --body "$(cat <<'EOF'
## Summary
- <1-3 bullets: what changed and why>

## Test plan
- [ ] <how to verify this>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Return the PR URL to the user.

## Rules

- Never `git add .` / `git add -A` — always explicit, reviewed paths.
- No confirmation gate between commit and push/PR — invoking this skill is the explicit
  request. Diff and message are shown for visibility, not approval.
- Never force-push. Never push directly to `main`/`master`.
- If anything about the staged content, branch state, or PR base looks wrong, stop and ask
  rather than guessing.
- Keep commits scoped to one module or one concern (`CLAUDE.md` §7).
