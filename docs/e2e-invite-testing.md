# E2E invite flow coverage

## What the tests do

The `e2e/invite.spec.ts` suite drives a serial, multi-user flow that creates invitations, accepts/rejects them, and checks the resulting member counts. It uses four predefined users and builds a matrix of invitations and expected actions.

## Flow under test

1. **Reset users**: Before all tests, each user is deleted via `POST /api/e2e/delete/user/:email`.
2. **Send invites**: Each user logs in, navigates to the Invitations page, submits multiple emails, and verifies those emails render in the invitations list.
3. **Handle invites**: Each user logs in and accepts or rejects invitations that target them on the organization home page.
4. **Verify member count**: Each user logs in and asserts the `member-count` card equals `1 + acceptedInvitationsSentByUser`.

## Code paths exercised

- **Login + session-based navigation**
  - `/login` magic link flow (UI only, not server logic specific to invites).
- **Invitations page (send + list)**
  - `src/routes/app.$organizationId.invitations.tsx` loader calls `authService.api.listInvitations`.
  - `invite` server fn calls `authService.api.createInvitation` with `resend: true`.
  - UI interactions rely on `data-testid="sidebar-invitations"` and `data-testid="invitations-list"`.
- **Accept/reject invitations**
  - `src/routes/app.$organizationId.index.tsx` accept/reject server fns call `authService.api.acceptInvitation` and `authService.api.rejectInvitation`.
  - UI buttons are matched by `aria-label="Accept invitation from ..."` / `"Reject invitation from ..."`.
- **Member count**
  - `src/routes/app.$organizationId.index.tsx` shows `memberCount` from `repository.getAppDashboardData` in the `data-testid="member-count"` element.

## Assertions made by the tests

- Invitations form clears after submission.
- Each invited email appears in the invitations list.
- Accept/reject buttons are clicked for matching inviters.
- After accept/reject, the test asserts `Inviter: ${email}` is not visible (note: current UI does not render this exact string).
- Member count equals `1 + acceptedInvitationsSentByUser` for each user.

## Gaps and risks

- **No role validation**: The invite role selector (`member`/`admin`) is never exercised.
- **No input validation**: Invalid email formats, >10 emails, and empty input paths are untested.
- **No permission coverage**: Users without `invitation:create`/`cancel` permissions are never tested.
- **No cancel flow**: The cancel invitation action on the invitations page is not exercised.
- **No pending invitation count**: The dashboard card for pending invitations is never asserted.
- **No empty states**: Invitations list empty message is not verified.
- **No resend behavior**: The `resend: true` path and existing invitation reuse is not asserted.
- **No error handling**: Mutation errors and alert rendering are not validated.
- **Weak accept/reject verification**: The post-action check looks for `Inviter: ${email}`, which the UI does not render, so it does not guarantee the invitation disappeared.

## Suggested tests to add

- **Role selection**: Invite as `admin` and assert role shown in invitations list.
- **Input validation**: Invalid email, >10 entries, empty input, and whitespace handling.
- **Permissions**: Verify non-managers cannot see the invite form or cancel buttons.
- **Cancel invitation**: Cancel a pending invitation and confirm it disappears from the list.
- **Pending invitation count**: Accept/reject and assert the pending count card updates.
- **Empty state**: New org with zero invitations shows the empty message.
- **Resend behavior**: Re-invite an existing pending email and verify status/expiry updates.
- **Accept/reject UI removal**: Assert the invitation card for the inviter disappears (by email), not a missing static string.
