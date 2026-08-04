# PaperPilot 🧭

**AI paperwork agent for government forms — built for Viksit Bharat Hackathon 2026 (PS12: "Lost in Government Paperwork")**

Government paperwork is confusing, jargon-heavy, and error-prone to fill manually. PaperPilot lets a user upload a document or name a government service, then:

1. **Understands** — Gemini's multimodal API extracts key fields and generates a plain-English explanation + checklist
2. **Confirms** — every extracted field is shown to the user for explicit review and edit before anything is finalized (no silent auto-submission)
3. **Fills** — a Playwright automation agent drafts the confirmed data into a self-hosted replica of the government form

Built by **Team Sync** — Sahil & Rudra M. Chavan, Terna Engineering College.

## Why a replica form, not the live portal?
Automating live government portals carries authorization, ToS, and fragility risks. PaperPilot demonstrates the full technical flow against a self-hosted replica; live portal integration is a roadmap item pending official API partnership.

## Tech Stack
- Frontend: React, Tailwind CSS
- Backend: Node.js, Express
- AI: Gemini API (multimodal extraction + explanation)
- Automation: Playwright
- Storage: session-only, no persistent DB (privacy-first MVP)
