# File Sync, Save, and Recent Documents Specification

## Status

Implemented on the `spec/file-sync-history` workstream. This specification extends `PRODUCT_SPEC.md` and the safe-save requirements in `INK_AND_PAPER_REVAMP_SPEC.md`.

The browser remains a least-privilege client: files are processed locally, document contents are never uploaded, and the application accesses only files or folders explicitly selected by the user.

## Goals

- Refresh an open document when its source changes on disk without reloading the application.
- Protect unsaved in-app edits from silent replacement.
- Save directly to the original file only when the browser provides a writable handle and the user has granted permission.
- Provide a private recent-documents list that remains useful across page reloads.
- Restore access to recent files when browser capabilities and permissions allow it.
- Preserve cross-browser fallbacks for file input, drag-and-drop, and directory input.

## Non-Goals

- Cloud storage, accounts, synchronization, or collaboration.
- Uploading Markdown or file metadata to a server.
- Watching arbitrary filesystem locations.
- Silent background access to files the user did not select.
- Automatic conflict merging in the first release.
- Persisting document contents or editor drafts in browser storage.
- Making experimental `FileSystemObserver` support a release requirement.

## Source Capabilities

Every document tab must carry explicit source capabilities instead of inferring behavior from its title or path.

| Source | Re-read while session is open | Reopen after page reload | Direct Save | Fallback |
| --- | --- | --- | --- | --- |
| File System Access file handle | Yes | Yes, after permission validation | If writable permission is granted | Save As / Download |
| File System Access directory handle | Yes | Yes, after permission validation | If the file handle is writable | Save As / Download |
| Standard file input | Not reliably | No | No | Locate again / Download |
| Directory-input fallback | Not reliably | No | No | Open folder again / Download |
| Drag-and-drop `File` | Not reliably | No | No | Locate again / Download |
| Public URL | Refetch explicitly | Yes, from stored URL | No | Download |
| Bundled example or cheat sheet | From bundled source | Yes | No | Download |

The source model should expose capabilities such as `canRefresh`, `canSave`, `canReopen`, and `requiresPermission`. Automated tests must use injected in-memory adapters rather than native operating-system dialogs.

## Disk Change Detection

### Supported Sources

For handle-backed files, request a fresh `File` from the handle and compare it with the last accepted disk version. The comparison should use `lastModified` and `size` as a fast check. If those values differ, read the text and compare the content before reporting a change.

The application should check:

- When the window regains focus.
- When the document becomes visible after being hidden.
- At a modest interval while the page is visible and the handle-backed tab is active. The initial interval should be three seconds.
- When the user invokes **Check for changes** or **Reload from disk**.

Background polling must pause while the page is hidden. Only active handle-backed files should be polled; inactive tabs may be checked when activated. Polling failures must not close the document or discard its current content.

### Refresh Behavior

If the disk content changes and the tab is clean:

- Replace the tab content without reloading the application page.
- Update the accepted disk version and original Markdown baseline.
- Preserve the current view mode.
- Preserve the reader position when practical; otherwise restore the nearest heading and then the previous scroll offset.
- Announce **Updated from disk** through a brief status message and an accessible live region.

If the disk content changes and the tab has unsaved edits:

- Do not replace either version automatically.
- Mark the tab as **Changed on disk** using text and an icon, not color alone.
- Show a persistent conflict notice with **Review changes**, **Reload from disk**, and **Keep my version** actions.
- **Reload from disk** must require confirmation because it discards the in-app draft.
- **Keep my version** retains the draft but does not overwrite disk until the user explicitly saves.
- Saving after an unresolved disk change must require confirmation or conflict review.

If the file is moved, deleted, permission is revoked, or reading fails, keep the current in-memory document available and show a persistent, actionable status.

### Unsupported Sources

Files opened through a standard input, directory-input fallback, or drag-and-drop are snapshots. The UI must not claim that these files are being watched. It should offer **Locate to refresh** and use a newly selected file only after validating its extension and, where possible, its expected name.

`FileSystemObserver` may later replace polling behind capability detection, but polling and focus checks remain the required implementation because observer support is experimental.

## Saving Edits

### Direct Save

Direct **Save** is available only for a document backed by a writable File System Access handle with current read-write permission.

- `Ctrl+S` on Windows/Linux and `Cmd+S` on macOS invoke Save and prevent the browser's page-save dialog when the editor is active.
- Saving writes the complete current Markdown draft to the selected file.
- A successful save updates the original Markdown baseline, clears the dirty state, records the new disk version, and displays **Saved**.
- Permission must be checked before writing. A permission prompt may only be requested from a user action.
- Failed or cancelled saves retain the dirty draft and show an actionable error.
- The first release must not autosave to disk.

Before writing, Save must check whether the disk version has changed since the last read or successful save. If it changed, the conflict flow must run before any overwrite.

### Save As and Download

- **Save As** uses a writable save picker when supported and associates the returned handle with the tab after a successful write.
- **Download .md** remains the universal fallback.
- Standard input files, drag-and-drop files, directory-input fallback files, URL imports, and bundled examples must never be silently overwritten.
- URL imports and bundled examples begin as editable copies and use Save As or Download.
- Filenames must retain `.md` or `.markdown`; invalid or missing extensions should be corrected safely.

### Page Exit and Closing

Dirty documents continue to trigger the existing close-tab, close-all, and page-exit warnings. A clean handle-backed document needs no warning. Recent-document storage must never be treated as a saved draft.

## Recent Documents

### User Experience

Add a **Recent documents** section to the private welcome screen and an equivalent entry in the source-action menu.

- Show up to 20 entries ordered by most recently opened.
- Display the filename, source type, optional folder label, last-opened time, and reopening status.
- Selecting a reopenable entry opens or activates its tab.
- Selecting a snapshot-only local entry starts **Locate to reopen**.
- URL and bundled entries reopen from their original source, subject to the existing URL security and CORS rules.
- Provide **Remove from history** per entry and **Clear history** for the list.
- Missing, denied, or moved sources remain removable and may offer **Locate** or **Grant access**.
- Duplicate entries are coalesced by a stable source identity where one is available.

The app must not automatically open every recent document at startup. Optional session restoration is a separate future decision because it increases permission prompts and complicates dirty-draft expectations.

### Stored Data

Recent history may store:

- A generated entry identifier.
- Display filename.
- Source type.
- Last-opened timestamp.
- A user-visible folder label or relative path when needed.
- Public source URL for URL imports.
- Bundled example identifier.
- Last reader position or nearest heading identifier.
- A file or directory handle when supported and explicitly enabled.

Recent history must not store:

- Markdown content.
- Editor drafts.
- Search queries.
- A recursively indexed copy of directory contents.
- Unnecessary absolute-path strings.

Metadata belongs in IndexedDB rather than `localStorage`. Filesystem handles are structured-clone values and, when supported, may be stored in the same database. Reading a persisted handle always begins with a permission check.

### Persistent Handle Preference

Persisting handles changes the current session-only permission policy and must be transparent to the user.

- Add an **Allow recent files to request access again** preference, enabled by default only after explanatory onboarding or an explicit recent-file action.
- Explain that the browser may remember a reference to selected files but the app does not copy or upload their contents.
- A stored handle does not bypass browser permission prompts.
- Turning the preference off removes stored handles while retaining non-sensitive recent metadata unless the user also clears history.
- **Clear history** removes both metadata and stored handles.
- If IndexedDB is unavailable, the app continues without persistent history.

## Permissions and Privacy

- File and directory pickers must always follow an explicit user action.
- Request the narrowest permission required: read permission for refresh and read-write permission for Save.
- Do not request directory access when a single file handle is sufficient.
- Never scan a home directory or any location outside the selected handle.
- Never transmit filenames, paths, handles, document contents, or history.
- Docker deployment must keep the same browser security boundary and must not add host filesystem mounts for this feature.
- Clearing site data may remove history and persisted handles; the interface should not imply otherwise.

## Accessibility and Responsive Behavior

- Disk status, dirty status, permission status, and conflicts must have textual labels.
- Status announcements must use appropriate non-interruptive or assertive live regions.
- All save, refresh, recent-item, conflict, and permission actions must be keyboard accessible.
- Confirmation dialogs must move focus predictably and return it to the triggering control.
- Recent documents use a compact list on desktop and a touch-friendly stacked list on phones.
- Conflict actions must remain usable in Preview, Write, Split, and Mind map modes.

## Error States

Provide specific recovery guidance for:

- Permission required or denied.
- File moved or deleted.
- Folder no longer available.
- File changed on disk while the tab is dirty.
- Read failure.
- Write failure or partial write rejection.
- Save picker cancellation.
- Unsupported browser capability.
- IndexedDB or persistent-storage failure.
- URL refresh blocked by CORS or network failure.

Errors must preserve the current in-memory document wherever possible.

## Implementation Sequence

1. Introduce source adapters and explicit read, write, reopen, and permission capabilities.
2. Implement manual and focus-triggered refresh for handle-backed files.
3. Add visible disk status and dirty-document conflict handling.
4. Implement capability-aware Save, Save As, Download, and keyboard shortcuts.
5. Add metadata-only recent history for all source types.
6. Add opt-in persistent handles and permission-aware reopening where supported.
7. Add visible-page polling and consider an observer optimization behind capability detection.

Refresh and Save must share one accepted disk-version model so they cannot make contradictory overwrite decisions.

## Verification

### Unit Tests

- Source capability derivation for every source type.
- Disk-version comparison and unchanged-content suppression.
- Clean refresh and dirty conflict transitions.
- Save success, failure, cancellation, and permission states.
- Pre-save external-change detection.
- Recent-entry ordering, limit, deduplication, removal, and clearing.
- IndexedDB schema migration and failure fallback.
- Stored-handle removal when the preference is disabled.

### Component Tests

- Automatic clean-tab refresh without a page reload.
- Dirty-tab conflict notice and each conflict action.
- Save availability and keyboard shortcuts by capability.
- Locate-to-refresh and locate-to-reopen fallbacks.
- Recent-documents empty, populated, denied, missing, and unsupported states.
- Accessible names, focus handling, and live announcements.

### Browser Tests

- Use injected in-memory filesystem adapters for deterministic automated coverage.
- Verify refresh, conflict, save, history, and responsive behavior in Chromium.
- Verify fallback behavior in Firefox and WebKit.
- Run axe checks for welcome history, status notices, conflict dialogs, and save controls.
- Never automate native file, directory, permission, or save dialogs.

### Manual Release Checks

- Open, refresh, persist, reopen, Save, Save As, revoke, and regrant access in current Chrome and Edge on Windows.
- Modify and delete an open file using another application and verify recovery behavior.
- Confirm standard-input and drag-and-drop files never claim direct-save or automatic-refresh support.
- Confirm browser refresh does not imply that unsaved drafts were persisted.
- Confirm clearing history removes stored handles and metadata.

## Acceptance Criteria

- A clean handle-backed document updates after an external disk change without reloading the application.
- An external change never silently replaces a dirty in-app draft.
- Direct Save is offered only when the tab has a writable handle and permission.
- Save detects an intervening disk change before overwriting.
- Every editable source has Save As or Download available.
- Recent history contains no Markdown content or drafts.
- Supported browsers can reopen a handle-backed recent entry after permission validation.
- Unsupported sources clearly use locate/reselect fallbacks.
- The feature remains private, responsive, accessible, and functional when persistent storage is unavailable.
