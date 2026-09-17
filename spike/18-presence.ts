// GATE 5 — verifying SCOPE.md's "not spike-tested" presence item using two
// genuinely distinct identities: eprisiadmin listens, eprisitester changes
// status via REST (users.setStatus), confirming the notify-logged/user-status
// event actually fires (hooks/usePresence.ts's assumed payload shape).
import { DDPSDK } from '@rocket.chat/ddp-client';

const WS_URL = process.env.RC_WS_URL || 'ws://localhost:3000';
const BASE_URL = process.env.RC_BASE_URL || 'http://localhost:3000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN!;
const TESTER_TOKEN = process.env.TESTER_TOKEN!;
const TESTER_USER_ID = process.env.TESTER_USER_ID!;

async function main() {
  const listener = await DDPSDK.createAndConnect(WS_URL);
  await listener.account.loginWithToken(ADMIN_TOKEN);
  listener.stream('notify-logged', ['user-status'], (...args: unknown[]) => {
    console.log('USER-STATUS EVENT:', JSON.stringify(args));
  });
  await new Promise((r) => setTimeout(r, 500));

  console.log('setting eprisitester status to away via REST');
  await fetch(`${BASE_URL}/api/v1/users.setStatus`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Auth-Token': TESTER_TOKEN, 'X-User-Id': TESTER_USER_ID },
    body: JSON.stringify({ status: 'away' }),
  }).then((r) => r.json());

  await new Promise((r) => setTimeout(r, 3000));
  process.exit(0);
}

main().catch((err) => {
  console.error('FAILED', err);
  process.exit(1);
});
