# Firebase Auth Migration

## Current State

Usev is now in a hybrid authentication phase:

- Email input signs in through Firebase Auth.
- Username input still uses the legacy `config/moderators` password hash flow.
- Successful Firebase Auth login still requires a matching moderator record.
- Moderator and editor pages verify the Firebase Auth session when `modAuthProvider` is `firebase`.

## Moderator Mapping

Firebase Auth users are mapped to moderator records in either of these ways:

```text
config/moderatorsByUid/{authUid} = "{moderatorKey}"
```

or directly on the moderator record:

```text
config/moderators/{moderatorKey}/authUid
config/moderators/{moderatorKey}/email
```

The account management panel can store `email`, optional `authUid`, and `orgIds` on moderator records.

Important: once strict database rules are deployed, `config/moderatorsByUid/{uid}` should be the primary mapping. Email scanning is only a transition convenience while the legacy database access model is still available.

## Important Limitation

The app does not create Firebase Auth users yet. Create users in Firebase Console or a future Admin SDK tool, then paste their UID into the moderator record from the account management panel.

This is intentional for now: creating Auth users securely should happen through Firebase Admin SDK or a trusted backend/Cloud Function, not from the public browser client.

## Next Steps

1. Enable Email/Password provider in Firebase Authentication.
2. Create a Firebase Auth user for each moderator.
3. Add the moderator email and UID in the Usev account management panel.
4. Test login with email/password.
5. Move from client-side session checks to `onAuthStateChanged`.
6. Ensure every Firebase Auth moderator has `config/moderatorsByUid/{uid}`.
7. Deploy a revised version of `database.rules.draft.json`.
8. Remove legacy `passwordHash` login after all moderators are migrated.
