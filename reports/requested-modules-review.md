# Requested module review — 2026-10-29

Reference: `sobhanzaminpeima/AIFekr`, origin/main verified at `b89eea53ec1e78a117718356d319aff3ac837b7f`.

All requested modules exist in the reference source and have dedicated local UI. Sales Agent is a CRM view, rather than a separate source page. This review concerns presentation and local interactions; it is not a claim of complete live-service parity.

| Module | Local entry | Dedicated interactions | Live-service gap |
|---|---|---|---|
| Fitness | /fitness | Workouts, nutrition, history, profile, marketplace | Connected coaching and payments |
| Student | /student | Subjects, materials, notes, study planning/timer, practice | Document processing and live AI tutoring |
| Business Doctor | /business-doctor | Business context, assessment, SWOT, actions, metrics, history | Source business-profile and AI analysis APIs |
| CRM | /crm | Pipeline, contacts, commercial/property workflows, reports | Shared server CRM and integrations |
| Sales Agent | /crm?tab=agent | Contextual assistant entry and automation area | Live sales agent execution |
| Intelligent Call Center | /voice-agent | Agents, knowledge, calls, appointments, CRM property knowledge | Telephony and real calls |
| Social Media | /social | Brand, content, calendar, queue, growth, competitors | Social account connection, publishing and live metrics |
| Lead Generation | /lead-gen | Forms, inbox, source summaries, CRM handoff | External advertising ingestion |
| SEO Workspace | /seo | Sites, keywords, content planning and research UI | Search service connections |
| SEO Intelligence | /seo/intelligence | Research, ranking/backlink records and explicit source status | Live rankings and backlinks are not connected |
| Accounting | /accounting | Journals, expenses, bank, payroll, budgets, closing, owner statements | Banking, tax integrations and real payments |
| AI Meeting | /meeting | Topic, selected advisers, authored notes/actions and history | Live multi-agent discussion |
| CEO Advisor | /ceo | Adviser, goals, orchestration, approvals and knowledge | Autonomous live agent execution |
| Video Factory | /video-factory | Brief, scenes, storyboard, versions, assets and publishing plans | Real rendering and external publishing |

Discovery changes: searchable goal-based home directory, task shortcuts, persistent workspace chooser in the header, featured Business Doctor entry, and exact Persian/English brand spelling. Business Doctor now retains optional revenue, website, offer and customer context and exposes the next three steps after assessment.
