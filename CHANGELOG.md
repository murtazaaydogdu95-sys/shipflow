# Changelog

All notable changes to CodePylot will be documented in this file.

## [1.1.0] - 2026-03-04

### Added
- Health check endpoint (`GET /api/health`)
- API-wide rate limiting (60 req/min)
- Notification triggers on story status changes
- Expanded audit log coverage (PROJECT_CREATED, PROJECT_UPDATED, PROJECT_DELETED, ORG_UPDATED, ORG_DELETED)
- Password reset flow (forgot password + email + reset)
- Outgoing webhooks (HMAC-SHA256 signed, configurable per project)
- Email digest (daily summary of unread notifications)
- Agent failure recovery (auto-mark stuck agents as FAILED)
- API documentation (Swagger UI at `/api/docs`)
- Admin dashboard (platform-wide stats and user list)
- Public roadmap page (`/roadmap`)
- Changelog page (`/changelog`)
- GitHub PR auto-linking (auto-comment on PRs with `[SF-XXX]`)
- CLI tool (`packages/cli/` — manage stories from terminal)
- Two-factor authentication (TOTP with backup codes)

## [1.0.0] - 2026-02-15

### Added
- Kanban board with drag-and-drop
- AI story rewrite (Anthropic, OpenAI, Ollama)
- Quick Capture (Cmd+K)
- Sprint management with velocity charts
- Agent automation (Claude Code integration)
- GitHub integration (import, webhooks, auto-complete)
- MCP server for Claude Code
- Multi-tenant organizations with RBAC
- Stripe billing (Free + Pro plans)
- Dark mode
