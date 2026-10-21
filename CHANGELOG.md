# Changelog

## 0.2.0-beta.1 — public source preparation

- Use package identity dsh-sensenzi-conversation-search because the original npm name belongs to another project; the repository slug remains unchanged.
- Retain the reviewed implementation, regenerate package-derived contract/client/patch/build info, and add six explicitly synthetic examples.
- Original private beta passed real authenticated GUI core checks on Windows / DSH 0.2.0-rc.2 / Node 24.21.0; the renamed candidate needs its own installation/runtime verification.
- Include an explicit 22-file package allowlist and six synthetic examples. npm publication and market acceptance are separate from source preparation.

## 0.2.0-beta.1 — private beta preparation

- Set author/copyright to sensenzi and include the 2026 MIT license.
- Bind the project to its private GitHub repository; update user, privacy and compatibility documentation.
- Retain the reviewed alpha8 search/runtime/client implementation, with beta version build provenance and canonical package-relative Loader patch.
- Keep npm publication locked with private=true. Public downloads, authenticated GUI acceptance and marketplace submission are pending.

## 0.2.0-alpha.8 — unpublished live binding identity checks

- Re-resolve the current SessionBinding, captured SessionFace, ConversationBinding and chat target source at existing navigation validation boundaries; stop with a fixed notice when an already-captured identity changes or cannot be verified.
- Keep source-node, root, DOM ownership, callback and cancellation checks. Normal fresh snapshots are allowed; a Conversation first acquired after history load is not treated as stale merely because it changed before capture.
- Do not retain host binding lifetimes, make identity checks atomic, trust spoofed same-source DOM keys, undo initiated host effects or certify actual Host/GUI integration. A change during scroll can stop highlighting/success but cannot undo the scroll.
- Keep alpha7 and previous candidates immutable; remain private/UNLICENSED and undeployed. Final identity, license, repository, GUI acceptance and public-action authorization are still required.

## 0.2.0-alpha.7 — unpublished fail-closed DOM provenance bridge

- Refuse duplicated visible session roots, exact source nodes, same-key DOM elements or visible chat tabs; do not choose the first possible target.
- Recheck captured root, source-node identity and exact DOM element before/after asynchronous waits, tab and beforematch actions, and animation-frame delays. Preserve unique hidden-until-found/DETAILS reveal and literal attribute equality.
- Treat hidden-until-found, inert and CSS-hidden roots/tabs as ineligible; report a source row still hidden after reveal as collapsed, not successful. Version-gate notice dismissal focus and avoid focusing ambiguous/foreign roots or stale/no-op row targets.
- Keep raw source text and fixed diagnostic boundaries; explain visual Unicode spoofing, raw copied-reference ambiguity and the remaining trusted-single-host-marker assumption. No host listener sandbox, side-effect rollback, deployment or public authorization.


## 0.2.0-alpha.6 — unpublished exception diagnostic boundary

- Keep authored public failures in private identity tables; unknown query/classifier/observation/disposal errors and arbitrary cancellation reasons become fixed messages, never reflected diagnostics. Host emits a fresh RemoteError with fixed code/text and empty details; client maps known codes to local text only.
- Preserve explicit scope/cursor/budget/source-unavailable explanations, partial-scan warnings, release attempts and concurrency limits. Navigation only reflects private local fixed failures; unknown bridge failures use a generic fallback.
- No source text redaction, exception logging, authentication bypass, deployment or public authorization; prior alpha4/alpha5 remain frozen.


## 0.2.0-alpha.5 — unpublished Unicode display-boundary hardening

- Keep excerpt, context, original-text and display-metadata cuts outside existing valid surrogate pairs while retaining exact UTF-16 source coordinates and the same wire caps; do not normalize or repair original text.
- Pair Host boundary alignment with a two-unit safety margin for Previous source windows so reverse navigation covers without gaps. Windows may overlap and are not inverse page indices; forward traversal remains exact.
- Clarify fragment-local highlighting, Unicode simple folding, query units and non-grapheme/non-normalization semantics; render empty EOF windows without an inverted numeric range.
- Remain private and undeployed. MIT has been selected, but author/copyright/repository and the final licensed public artifact remain unconfirmed; no public action is authorized by these tests.

## 0.2.0-alpha.4 — unpublished explicit-source ancestry hardening

- Treat any non-empty `sourceEventSeqs` list as authoritative. If it does not identify exactly one eligible tool call in the current pending bucket (including when it cites a non-tool event), leave the result unpaired; never fall back to a singleton chronological call.
- Add focused regression coverage for explicit non-tool, unknown, multiple and conflicting source lists. This is a correctness/privacy hardening release only; no publication or deployment.

## 0.2.0-alpha.3 — unpublished resource/lifecycle/accessibility hardening

- Replace repeated short-timer yields with setImmediate event-loop checkpoints; reuse metadata maps and stream document projection/top-k/context instead of retaining whole-session text documents.
- Key unconsumed tool occurrences by seq within matching buckets; exact cited-source lookup/deletion no longer scans all overlapping heads.
- Commit each session's bounded hits only after it is fully consumed; failed sessions cannot leave misleading partial matches.
- Abort in-flight Host queries when its plugin lifetime ends, not merely withdraw RPC methods.
- Focus the named original/context region after async reading; close/Escape returns focus to its result opener; clear returns to search input.
- Keyboard-dismissable navigation notice and reduced-motion scroll/flash behavior; busy state and constrained small-width controls.
- Synthetic large-log/cold-concurrency/reload, keyboard/contrast/reflow checks complement prior correctness tests. No public publication, deployment or full WCAG certification implied.

## 0.2.0-alpha.2 — unpublished correctness hardening

- Pair tool executions by chronological occurrence and turn/step, with conservative explicit call-source and content-only rewrite lineage; repeated call IDs no longer overwrite earlier names/visibility.
- Locate tools only by settled result event seq or a call's exact paired original result; pending, rewritten and ambiguous records fall back honestly.
- Paginate and read detail against immutable completed request options; stateless catalog tokens reject stale/mixed cursors before observing text.
- Bound display metadata with a visible marker, never truncate an address into another identity; strict direct/remote validation remains shared.
- Budget only selected tool/history text, check cancellation after final yields, and release all observation/concurrency slots.
- Add explicit clear-results action and keep original-result privacy/highlight/options after controls change.
- Core, independent occurrence, browser UI and packed real-runtime verification are tracked by the task, not public approval. Not deployed or publicly released.

## 0.2.0-alpha.1 — unpublished release candidate

- Start isolated productization of original local-only prototype.
- Replace machine-specific Host imports and file-URL Cordis patch with declared runtime peers and package-name entry.
- Deterministic client build ID follows package name; checksum provenance and stale-build check.
- Explicit package file whitelist excludes activation probes, private test fixtures, deployment backups and task metadata.
- Review/verification in progress; not a public release or marketplace approval.
