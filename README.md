# BetU

Production-grade web application with Git Flow branching strategy, CI/CD pipeline, and quality gates.

## Getting Started

### Prerequisites
- Node.js 18+ / npm 9+
- Git 2.30+

### Installation

```bash
# Clone repository
git clone https://github.com/HARISHMARAN/BetU.git
cd BetU

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
```

### Development

```bash
# Create feature branch
git checkout -b feature/BETU-123-description develop

# Start development server
npm run dev

# Run tests
npm run test

# Run linter
npm run lint

# Commit with conventional format
git commit -m "feat: implement feature description"

# Push and create PR
git push -u origin feature/BETU-123-description
```

## Branching Strategy

See [BRANCHING_STRATEGY.md](.github/BRANCHING_STRATEGY.md) for full details.

**Quick reference:**
- `main` — Production-ready (protected)
- `develop` — Integration branch for next release (protected)
- `feature/*` — Feature development
- `bugfix/*` — Bug fixes
- `hotfix/*` — Critical production fixes
- `release/*` — Release preparation

## CI/CD

All branches trigger automated CI checks:
- ✅ Tests (coverage ≥80%)
- ✅ Lint (ESLint)
- ✅ Type check (TypeScript)
- ✅ Build verification
- ✅ Security scan (Trivy)
- ✅ E2E tests (PRs only)

## Testing

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests (Playwright)
npm run test:e2e

# Coverage report
npm run test:coverage
```

## Code Quality

- **Minimum coverage:** 80%
- **Coding style:** [ECC rules](https://github.com/HARISHMARAN/.claude/rules/ecc/)
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/)
- **PRs:** Require code review + CI pass

## Deployment

- **Staging:** Automatic on merge to `develop`
- **Production:** Automatic on tag creation (via release branch merge to `main`)
- **Hotfixes:** Immediate merge to both `main` and `develop`

## Release Process

1. Create release branch: `git checkout -b release/1.2.0 develop`
2. Update version + changelog
3. Create PR to `main` with release notes
4. After merge, tag: `git tag -a v1.2.0`
5. Merge back to `develop`
6. CI/CD handles deployment

See [BRANCHING_STRATEGY.md](.github/BRANCHING_STRATEGY.md#release-workflow) for details.

## Contributing

1. Check [BRANCHING_STRATEGY.md](.github/BRANCHING_STRATEGY.md)
2. Create feature branch from `develop`
3. Make focused commits
4. Submit PR with description + test plan
5. Address code review feedback
6. Merge via squash + commit (maintainers only)

## License

[Add your license]
