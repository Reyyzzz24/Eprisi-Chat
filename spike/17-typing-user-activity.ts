import { DDPSDK } from '@rocket.chat/ddp-client';

const WS_URL = process.env.RC_WS_URL || 'ws://localhost:3000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN!;
const TESTER_TOKEN = process.env.TESTER_TOKEN!;

async function main() {
  const listener = await DDPSDK.createAndConnect(WS_URL);
  await listener.account.loginWithToken(ADMIN_TOKEN);
  listener.stream('notify-room', ['GENERAL/user-activity'], (...args: unknown[]) => {
    console.log('ACTIVITY EVENT:', JSON.stringify(args));
  });
  await new Promise((r) => setTimeout(r, 500));

  const sender = await DDPSDK.createAndConnect(WS_URL);
  await sender.account.loginWithToken(TESTER_TOKEN);
  console.log('sending user-activity=[user-typing]');
  await sender.call('stream-notify-room', 'GENERAL/user-activity', 'eprisitester', ['user-typing'], {});
  await new Promise((r) => setTimeout(r, 3000));
  console.log('sending user-activity=[]');
  await sender.call('stream-notify-room', 'GENERAL/user-activity', 'eprisitester', [], {});
  await new Promise((r) => setTimeout(r, 1000));
  process.exit(0);
}

main().catch((err) => {
  console.error('FAILED', err);
  process.exit(1);
});
