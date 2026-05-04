# Usev Sprint 1 Notes

## Scope

This sprint starts the migration from a single global live game to room-scoped live games.

Live game state now resolves through:

```text
rooms/{roomId}/game
```

The default room is `main`, so existing URLs still have a fallback. Parallel events can be opened with:

```text
moderator.html?room=event-a
projeksiyon.html?room=event-a
index.html?room=event-a
istatistik.html?room=event-a
```

## Changed

- Player, moderator, projection, statistics, and sound sync live game paths are room-scoped.
- Moderator login/editor/statistics navigation preserves the active `room` query.
- Projection QR codes point players to `index.html?room={roomId}`.
- Player join flow was restored and now writes connections under the active room.
- Missing Firebase imports used by the player and projection screens were added.
- Static JavaScript syntax was checked across the main HTML files.

## Still Global

These are intentionally not moved yet and need a later organization/user model:

- `questions`
- `sets`
- `shared_sets`
- `config/moderators`
- `history`

## Next Step

Move question sets and game history under an organization/owner model, then add Firebase Auth and database rules.

## Sprint 1 Continuation

Content and reporting data now have an organization namespace:

```text
orgs/{orgId}/questions
orgs/{orgId}/sets
orgs/{orgId}/shared_sets
orgs/{orgId}/history
```

The default organization is `main`. Moderator, editor, projection, login, and statistics URLs preserve both `room` and `org`:

```text
moderator.html?room=event-a&org=main
editor.html?room=event-a&org=main
istatistik.html?room=event-a&org=main
```

For backward compatibility, when an org-scoped collection is empty the app reads the old root collections (`questions`, `sets`, `history`) as a fallback. New writes go to the org-scoped paths.

`config/moderators` is still global for now. It should move behind Firebase Auth/claims rather than being copied into org data.

## Sprint 1 Org Management Continuation

Organization records now live under:

```text
config/orgs/{orgId}
```

The admin account management panel can:

- create organization records
- list existing organizations
- assign one or more `orgIds` to newly created moderator/admin accounts

Login now checks whether the selected `org` is allowed by the moderator account. Legacy admin accounts without `orgIds` are treated as platform-wide admins (`["*"]`) for compatibility.

A non-deployed Firebase Realtime Database rules draft was added:

```text
database.rules.draft.json
```

Do not deploy this rules file before Firebase Auth is implemented; the current app still uses client-side session auth.

## Firebase Auth Transition

Login now supports a hybrid mode:

- Email address input attempts Firebase Auth sign-in.
- Username input uses the legacy moderator password-hash flow.
- Firebase Auth sign-in must map to a moderator record through `config/moderatorsByUid/{uid}` or matching `authUid`/`email` fields on `config/moderators/{key}`.

See:

```text
AUTH_MIGRATION.md
```

The account management panel now stores optional Firebase Auth email and UID values for moderator records, but it does not create Firebase Auth users. Those users must currently be created from Firebase Console or a future trusted backend/Admin SDK flow.

Protected moderator/editor pages now verify the active Firebase Auth user when the session was created through Firebase Auth. Legacy username sessions remain as a temporary fallback during migration.

## Sprint 1 Finalization (Hardening)

- **Database Rules Updated:** `database.rules.draft.json` has been updated to use `config/moderators` and `orgIds` maps for robust authorization.
- **Persistent Auth Listeners:** `moderator.html`, `editor.html`, and `istatistik.html` now use `onAuthStateChanged` listeners to react to session changes in real-time.
- **Org Access Map:** Moderator `orgIds` are now stored as a map (`{"orgId": true}`) to allow efficient Firebase Security Rule checks.
- **Migration Helper:** Logged-in Firebase users without a `config/moderatorsByUid` mapping are automatically mapped if their email matches an existing moderator record.
- **Unified Auth Guard:** `istatistik.html` now includes the same auth protection as other moderator pages.

