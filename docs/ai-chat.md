# Dashboard chat and reusable local caching

## Testing Ask AI

Both the sticky page-header Ask AI button and campaign-summary follow-up button open `app/bluevua/testing/testing-ai.tsx`. Desktop docks at 464 px (resize 420–640 px); the main page contracts. Below 1280 px it overlays, with full-screen mobile layout, Escape dismissal and focus containment. Campaign data and short summaries remain on the page; existing detailed analysis is readable in the side panel without asking AI again.

`useTestingAiScope` registers actual server-rendered campaign/date identities. Date/page changes keep the old discussion pinned until the user adopts the new scope; each historical question retains its own campaign and period. Three channel-specific, bilingual suggestions are local templates. Scope controls can select another channel/campaign or explicitly expand a comparison.

`/api/testing/chat` is an independent authenticated Testing API. It never calls `/api/klaviyo/ask`, `askCodex()` or the EDM Dashboard intelligence builder. `lib/testing-chat-context.ts` loads the existing configured testing scope with the exact dates, ad-level performance where available, matching saved readouts and known creative navigation links. Unavailable channels are reported as gaps; other-date analysis cannot become current-period data. Social and concluded snapshots retain lifetime semantics. Prompt: `prompts/ask-ai/testing.md`.

Requests use the existing server queue/Bridge infrastructure, but directly select the native Bluevua project (`conversation.project=bluevua`), with separate Testing ownership and dashboard ID `bluevua-testing-chat`. Native conversation titles include the authenticated user's email. No model call occurs on opening, navigating, switching language, reading cached analysis or restoring history. A new submitted question is the inference trigger. Replies default to one conclusion, 2–3 evidence points and one action, with supplied links. The current Bridge returns a completed answer: the UI shows honest progress while waiting, then reveals the completed text incrementally; it does not claim native token streaming.

Server history comes from the persisted original queue results, scoped by the authenticated Google subject and Testing conversation ID. The history picker restores prior chats after browser data loss. New Chat creates a separate conversation ID; old server/native records remain. All reads/cancels check server ownership. Client-provided owner/email are never trusted.

Cancel uses the existing Bridge `/cancel` endpoint for an accepted native job. Before submission, a stopped queue tombstone under the same idempotent request ID prevents late data preparation from enqueueing an orphan turn. Uncertain submission/cancellation is reported rather than freeing the global queue slot speculatively. A cancelled/failed native turn may leave its Bridge conversation conservatively blocked; subsequent requests use a fresh native segment and carry scoped saved history, preserving the website conversation without resetting shared Bridge state.

Local development cancellation requires the configured Bridge tunnel (current local URL points to 127.0.0.1:18788). The remote worker handles ordinary inference through the shared queue; no website deployment or Bridge code change is required for local feature development.

## Shared browser cache, for Testing, EDM and future dashboards

Use `lib/ai-chat-local.ts`, not a dashboard-specific storage implementation:

```ts
const cached = await readLocalAiChat<MyConversation>('my-dashboard', googleOwnerHash);
await writeLocalAiChat('my-dashboard', googleOwnerHash, {
  conversationId, messages, draft,
});
```

Pass the owner hash from the authenticated server layout/page (stable Google subject, not mutable email). Dashboard namespaces prevent Testing and EDM history mixing. The IndexedDB database is `emw3-ai-chat`; it stores the latest conversation and a per-conversation copy. Credentials, session tokens and attachment bytes must never enter the cache. Account namespaces prevent accidental UI mixing; this is ordinary browser-profile storage, not OS-level encryption or a separate origin per account.

Restore local history/draft immediately, then synchronize persisted server history in the background. This synchronization reads existing answers; it never regenerates them. Clear browser data, private browsing, quota failures and other devices can remove the local fast copy; server/native history remains the recovery source. An unsent draft has no server copy. If IndexedDB is unavailable, keep server history functional. Never fuzzy-match an old answer and present it as a fresh answer for new dates/data.

EDM Ask AI uses namespace `edm`, restores cached messages/draft before its existing authenticated native-history read, and strips attachment preview bytes from cached message metadata. Its own AI endpoint and existing EDM prompt remain unchanged. Future dashboards must provide an authenticated durable history API and integrate these same local-first helpers; they should not automatically reuse another dashboard's AI prompt or context builder.

## Verification

`lib/testing-chat-contract.test.ts` checks exact scopes, invalid dates/paths and the three bilingual templates for every channel. Local rendered verification covers desktop docking/resize, mobile layout/focus, campaign/date changes, comparison scope, cache restoration after refresh, and zero inference submissions while browsing. An actual AI Bluevua request returned the supplied concluded-test ROAS and materials link; queued/pending cancellation and cross-account access are checked independently. EDM cache behavior is exercised in its actual AskAi component with mocked history/inference transport, avoiding an unnecessary EDM model call.
