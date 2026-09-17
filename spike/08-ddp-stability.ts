// GATE 1, spike #8: DDP ping/pong stability over 5 minutes
import { readFileSync, writeFileSync } from 'node:fs';

import { DDPSDK } from '@rocket.chat/ddp-client';

import { WS_URL } from './config.ts';

const { authToken } = JSON.parse(readFileSync(new URL('./.session.json', import.meta.url), 'utf-8'));

const DURATION_MS = 5 * 60 * 1000;
const log: string[] = [];
const say = (s: string) => {
	console.log(s);
	log.push(s);
};

async function main() {
	say(`# Spike 08 — DDP 5-minute stability\n`);
	const sdk = await DDPSDK.createAndConnect(WS_URL);
	await sdk.account.loginWithToken(authToken);
	say(`Connected + logged in at ${new Date().toISOString()}. Watching for ${DURATION_MS / 1000}s...\n`);

	let disconnects = 0;
	let reconnects = 0;
	sdk.connection.on('disconnected', () => {
		disconnects++;
		say(`[${new Date().toISOString()}] disconnected event (#${disconnects})`);
	});
	sdk.connection.on('connected', () => {
		reconnects++;
		say(`[${new Date().toISOString()}] connected event (#${reconnects})`);
	});

	const start = Date.now();
	const heartbeat = setInterval(() => {
		say(`[${new Date().toISOString()}] still alive, status=${sdk.connection.status}, elapsed=${Math.round((Date.now() - start) / 1000)}s`);
		writeFileSync(new URL('./08-RESULT.md', import.meta.url), log.join('\n'));
	}, 30000);

	await new Promise((r) => setTimeout(r, DURATION_MS));
	clearInterval(heartbeat);

	say(`\n## Result after ${DURATION_MS / 1000}s`);
	say(`Final status: ${sdk.connection.status}`);
	say(`Disconnect events: ${disconnects}, (re)connect events: ${reconnects}`);
	say(
		disconnects === 0
			? `**PASS** — connection remained stable for the full 5 minutes with no disconnects.`
			: `**NOTE** — ${disconnects} disconnect(s) occurred; check whether SDK auto-reconnected (reconnects=${reconnects}) and whether subscriptions survived (not verified by this script alone).`,
	);

	writeFileSync(new URL('./08-RESULT.md', import.meta.url), log.join('\n'));
	// NOTE: logout() intentionally NOT called — it revokes the shared authToken in .session.json that other spike scripts reuse
	process.exit(0);
}

main().catch((err) => {
	console.error('SPIKE FAILED:', err);
	process.exit(1);
});
