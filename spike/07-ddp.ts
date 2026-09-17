// GATE 1, spikes #7, #9, #10: DDP connect+subscribe, stream-notify-user, typing
// (spike #8, 5-minute stability, is a separate long-running script: 08-ddp-stability.ts)
import { readFileSync, writeFileSync } from 'node:fs';

import { DDPSDK } from '@rocket.chat/ddp-client';

import { BASE_URL, WS_URL } from './config.ts';

const { authToken, userId } = JSON.parse(readFileSync(new URL('./.session.json', import.meta.url), 'utf-8'));

const log: string[] = [];
const say = (s: string) => {
	console.log(s);
	log.push(s);
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
	return Promise.race([
		promise,
		new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`TIMEOUT after ${ms}ms waiting for: ${label}`)), ms)),
	]);
}

async function main() {
	say(`# Spike 07 — DDP connect, subscribe, notify streams, typing\n`);
	say(`WS URL: ${WS_URL}\n`);

	// #7a — connect
	const t0 = Date.now();
	const sdk = await DDPSDK.createAndConnect(WS_URL);
	say(`## #7a DDPSDK.createAndConnect`);
	say(`Connected in ${Date.now() - t0}ms\n`);

	// #7b — loginWithToken
	const t1 = Date.now();
	const loginResult = await withTimeout(sdk.account.loginWithToken(authToken), 10000, 'loginWithToken');
	say(`## #7b account.loginWithToken`);
	say(`Logged in as uid \`${sdk.account.uid}\` in ${Date.now() - t1}ms`);
	say('```json');
	say(JSON.stringify({ id: loginResult.id, tokenExpires: loginResult.tokenExpires }, null, 2));
	say('```\n');

	// #7c — subscribe to room-messages for GENERAL, then send a REST message and verify the callback fires
	say(`## #7c stream('room-messages', rid, cb) — verify callback fires on a REST-sent message`);
	let received: any = null;
	const roomMessagesSub = sdk.stream('room-messages', ['GENERAL'], (msg: any) => {
		received = msg;
	});
	await new Promise((r) => setTimeout(r, 500)); // let subscription settle

	const testMsg = `spike-ddp-test ${new Date().toISOString()}`;
	await fetch(`${BASE_URL}/api/v1/chat.sendMessage`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken, 'X-User-Id': userId },
		body: JSON.stringify({ message: { rid: 'GENERAL', msg: testMsg } }),
	});

	const gotIt = await new Promise<boolean>((resolve) => {
		const start = Date.now();
		const iv = setInterval(() => {
			if (received?.msg === testMsg) {
				clearInterval(iv);
				resolve(true);
			} else if (Date.now() - start > 8000) {
				clearInterval(iv);
				resolve(false);
			}
		}, 100);
	});
	say(`Sent REST message: \`${testMsg}\``);
	say(gotIt ? `**PASS** — DDP callback fired with the matching message within 8s.` : `**FAIL** — DDP callback did not fire within 8s.`);
	say('```json');
	say(JSON.stringify(received, null, 2));
	say('```\n');
	roomMessagesSub.stop();

	// #9 — stream-notify-user
	say(`## #9 stream-notify-user/<uid>/subscriptions-changed, rooms-changed, notification`);
	const notifyEvents: Record<string, any> = {};
	const subs = ['subscriptions-changed', 'rooms-changed', 'notification'].map((evt) =>
		sdk.stream('notify-user', [`${sdk.account.uid}/${evt}`], (...args: unknown[]) => {
			notifyEvents[evt] = args;
		}),
	);
	await new Promise((r) => setTimeout(r, 500));
	// Trigger subscriptions-changed / rooms-changed by creating a room via REST
	const createRes = await fetch(`${BASE_URL}/api/v1/channels.create`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'X-Auth-Token': authToken, 'X-User-Id': userId },
		body: JSON.stringify({ name: `spike-notify-test-${Date.now()}` }),
	}).then((r) => r.json());
	await new Promise((r) => setTimeout(r, 2000));
	say(`Triggered via \`channels.create\` (rid: ${createRes?.channel?._id ?? 'n/a'}):`);
	say('```json');
	say(JSON.stringify(notifyEvents, null, 2));
	say('```');
	say(
		Object.keys(notifyEvents).length > 0
			? `**PASS** — at least one notify-user event fired (${Object.keys(notifyEvents).join(', ')}).`
			: `**FAIL** — no notify-user events observed within 2.5s of the trigger.`,
	);
	say('');
	subs.forEach((s) => s.stop());

	// #10 — typing indicator via stream-notify-room
	say(`## #10 stream-notify-room/<rid>/typing`);
	let typingEvent: unknown = null;
	const typingSub = sdk.stream('notify-room', ['GENERAL/typing'], (...args: unknown[]) => {
		typingEvent = args;
	});
	await new Promise((r) => setTimeout(r, 500));
	let typingCallError: string | null = null;
	try {
		// This is a DDP *method* call (not a subscription) — used here only to
		// prove/disprove the mechanism exists, NOT as a pattern for production
		// (WRAPPER_PROMPT.md restricts actions to REST; if this is the only way
		// to signal typing, that's a real scope gap to report).
		await sdk.call('stream-notify-room', `GENERAL/typing`, 'eprisiadmin-spike', true);
	} catch (err) {
		typingCallError = err instanceof Error ? err.message : String(err);
	}
	await new Promise((r) => setTimeout(r, 1500));
	say(`Attempted via DDP method call \`stream-notify-room\` (not REST — no REST equivalent found in rc-fork source):`);
	if (typingCallError) {
		say(`Method call error: \`${typingCallError}\``);
	}
	say('```json');
	say(JSON.stringify(typingEvent, null, 2));
	say('```');
	say(
		typingEvent
			? `**PASS (mechanism exists)** — but only reachable via a deprecated-per-docs DDP method call, not REST. Flag for GATE 2 scope decision.`
			: `**FAIL / INCONCLUSIVE** — no typing event observed. Could not find a REST endpoint for typing in rc-fork source either.`,
	);
	typingSub.stop();

	// NOTE: logout() intentionally NOT called — it revokes the shared authToken in .session.json that other spike scripts reuse
	writeFileSync(new URL('./07-RESULT.md', import.meta.url), log.join('\n'));
	process.exit(0);
}

main().catch((err) => {
	console.error('SPIKE FAILED:', err);
	process.exit(1);
});
