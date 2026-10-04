# BetU Production Branching Strategy

## Overview
Git Flow variant optimized for production-grade web app with CI/CD.

## Branch Structure

### Primary Branches

**`main`** (Protected)
- Production-ready code only
- Direct commits prohibited
- Requires PR + CI pass + code review
- Tagged with versions (v1.0.0, v2.1.3)
- Deployed to production via CI/CD

**`develop`** (Protected)
- Integration branch for next release
- Base for all feature branches
- Requires PR + CI pass
- Deployed to staging environment
- Becomes `main` via release PR

### Supporting Branches

**Feature Branches** — `feature/<ticket-id>-<description>`
```
feature/BETU-123-user-auth
feature/BETU-456-payment-integration
```
- Branch from: `develop`
- Merge back to: `develop` (via PR)
- PR template: [Link to template]
- Naming: lowercase, hyphenated, include ticket ID
- Lifespan: ~1-7 days

**Bugfix Branches** — `bugfix/<ticket-id>-<description>`
```
bugfix/BETU-789-login-crash
bugfix/BETU-234-null-pointer
```
- Branch from: `develop`
- Merge back to: `develop` (via PR)
- For bugs found in development
- Lifespan: ~1-3 days

**Hotfix Branches** — `hotfix/<ticket-id>-<description>`
```
hotfix/BETU-999-payment-broken
hotfix/BETU-888-critical-ui-crash
```
- Branch from: `main`
- Merge back to: BOTH `main` and `develop`
- For critical production bugs only
- Requires: Immediate review, fast-track CI
- Lifespan: <1 day

**Release Branches** — `release/<version>`
```
release/1.0.0
release/2.1.0-beta
```
- Branch from: `develop`
- Merge back to: BOTH `main` (tag) and `develop`
- Lock new features, allow bug fixes + docs only
- Version bumps: Major.Minor.Patch
- Lifespan: ~3-7 days (stabilization period)

**Experimental Branches** — `exp/<experiment-name>`
```
exp/ai-recommendations
exp/dark-mode-redesign
```
- Branch from: `develop`
- Purpose: Non-binding experiments, POCs, spikes
- No PR requirement; auto-deleted after 30 days
- Never merge to main/develop directly

## Workflow

### Creating a Feature

```bash
# Update develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/BETU-123-description

# Make commits
git add .
git commit -m "feat: implement feature description"

# Push and create PR
git push -u origin feature/BETU-123-description
# → Open PR on GitHub, link ticket, add description
```

### PR Requirements

- ✅ CI/CD pipeline passes (build, lint, test, coverage ≥80%)
- ✅ At least 1 code review approval
- ✅ All conversations resolved
- ✅ Branch updated with main/develop (no conflicts)
- ✅ Security checks pass (no secrets, no vulnerabilities)

### Merging Strategy

**Default:** Squash + Merge (linear history)
- Exception: Keep commits for major features (multi-file, complex logic)
- Use conventional commits format in merge commit message

**Protection Rules:**
```
- Require PR reviews before merging
- Require status checks to pass
- Require branches to be up to date
- Require code owner review (if CODEOWNERS exists)
- Block force pushes
- Block deletions
```

### Release Workflow

```bash
# 1. Create release branch from develop
git checkout -b release/1.2.0 develop

# 2. Bump versions (package.json, etc)
# Update CHANGELOG.md
git commit -am "chore: version bump 1.2.0"

# 3. Create PR to main
git push -u origin release/1.2.0
# → PR: release/1.2.0 → main (add release notes)

# 4. After merge to main, tag it
git checkout main
git pull origin main
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0

# 5. Merge release branch back to develop
git checkout develop
git pull origin develop
git merge --no-ff release/1.2.0
git push origin develop

# 6. Delete release branch
git push origin --delete release/1.2.0
```

### Hotfix Workflow

```bash
# 1. Create hotfix from main
git checkout -b hotfix/BETU-999 main

# 2. Fix the bug + test
git commit -am "fix: critical bug description"

# 3. Create PR to main + develop
git push -u origin hotfix/BETU-999
# → Create 2 PRs:
#   - hotfix/BETU-999 → main (urgent label)
#   - hotfix/BETU-999 → develop

# 4. After merge to main, tag it
git checkout main
git pull
git tag -a v1.2.1 -m "Hotfix v1.2.1"
git push origin v1.2.1

# 5. Delete hotfix branch
git push origin --delete hotfix/BETU-999
```

## CI/CD Integration

### On PR Creation/Update
- Run tests (jest/pytest/etc)
- Lint (eslint/ruff/golangci)
- Type check (tsc/mypy/go vet)
- Code coverage (target: ≥80%)
- Security scan (trivy/snyk)
- Build verification

### On Merge to Develop
- Deploy to staging environment
- Run full E2E tests
- Performance regression check

### On Merge to Main
- Build production artifact
- Run smoke tests
- Deploy to production (blue-green or canary)
- Monitor health metrics

### On Tag
- Trigger production deployment
- Update release notes on GitHub
- Notify stakeholders

## Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** feat, fix, refactor, test, docs, chore, perf, ci

**Example:**
```
feat(auth): implement OAuth2 provider integration

Add support for Google and GitHub OAuth2.
Implements secure token storage and refresh logic.

Fixes BETU-123
Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

## Branch Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/<id>-<desc>` | `feature/BETU-101-dark-mode` |
| Bugfix | `bugfix/<id>-<desc>` | `bugfix/BETU-202-nav-crash` |
| Hotfix | `hotfix/<id>-<desc>` | `hotfix/BETU-303-payment-down` |
| Release | `release/<version>` | `release/1.2.0` |
| Experimental | `exp/<desc>` | `exp/ml-recommendations` |

**Rules:**
- Lowercase only
- Hyphens for word separation
- Include ticket ID (feature/bugfix/hotfix only)
- Max 50 chars after type/

## Protection Rules Setup

```bash
# Main branch
- Require PR reviews (1 minimum)
- Require status checks to pass
- Require branches up to date
- Dismiss stale reviews on push
- Block force push
- Block deletion

# Develop branch
- Require PR reviews (1 minimum)
- Require status checks to pass
- Allow deletions: NO
- Allow force push: NO
```

## Release Schedule

- **Hotfixes:** Immediate (on-demand)
- **Patch releases:** Weekly (Friday EOD)
- **Minor releases:** Bi-weekly (every other Thursday)
- **Major releases:** Monthly or milestone-driven

## Troubleshooting

### Accidentally Committed to Main
```bash
git reset HEAD~1
git branch -b feature/BETU-XXX
git push -u origin feature/BETU-XXX
```

### Need to Update Feature with Latest Develop
```bash
git fetch origin
git rebase origin/develop
# or merge: git merge origin/develop
git push -f origin feature/BETU-XXX
```

### Merge Conflicts
```bash
# Manual resolution
git merge origin/develop
# Fix conflicts in editor
git add .
git commit -m "chore: resolve merge conflicts"
```

## Enforcement

- **GitHub branch protection rules** (enforce via repo settings)
- **CI/CD pipeline** (enforce via workflow)
- **Code owners file** (for critical paths)
- **Pre-commit hooks** (conventional commits + no secrets)

## Version Tagging

Follows [Semantic Versioning](https://semver.org/):
- `v<MAJOR>.<MINOR>.<PATCH>` (e.g., `v1.2.3`)
- `v<MAJOR>.<MINOR>.<PATCH>-<prerelease>` (e.g., `v1.2.0-beta`, `v1.2.0-rc.1`)

