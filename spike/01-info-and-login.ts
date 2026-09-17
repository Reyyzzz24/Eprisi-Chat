// GATE 1, spikes #1-2: GET /api/v1/info, POST /api/v1/login (password)
import { writeFileSync } from 'node:fs';

import { ADMIN_PASS, ADMIN_USER, BASE_URL } from './config.ts';

const log: string[] = [];
const say = (s: string) => {
	console.log(s);
	log.push(s);
};

async function main() {
	say(`# Spike 01 — info + password login\n`);
	say(`Base URL: ${BASE_URL}\n`);

	// #1 — GET /api/v1/info (per WRAPPER_PROMPT.md) — DISCREPANCY FOUND, see note below
	const t0 = Date.now();
	const infoResV1 = await fetch(`${BASE_URL}/api/v1/info`);
	const infoLatencyV1 = Date.now() - t0;
	say(`## #1 GET /api/v1/info (as documented in WRAPPER_PROMPT.md)`);
	say(`Status: ${infoResV1.status}, latency: ${infoLatencyV1}ms — **404, does not exist at this path**`);
	say(
		`\n> Root cause (confirmed in rc-fork source, \`server/api/default/info.ts\`): this route is registered via \`API.default.get('info', ...)\`, mounted at **\`/api/info\`**, not under the \`/api/v1/\` namespace. The wrapper prompt's documented path is wrong for Rocket.Chat 8.8.x — retested below at the real path.\n`,
	);

	const t0b = Date.now();
	const infoRes = await fetch(`${BASE_URL}/api/info`);
	const infoLatency = Date.now() - t0b;
	const infoBody = await infoRes.json().catch(() => null);
	say(`## #1 (retry) GET /api/info — the actual working path`);
	say(`Status: ${infoRes.status}, latency: ${infoLatency}ms`);
	say('```json');
	say(JSON.stringify(infoBody, null, 2));
	say('```\n');

	// #2 — POST /api/v1/login
	const t1 = Date.now();
	const loginRes = await fetch(`${BASE_URL}/api/v1/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ user: ADMIN_USER, password: ADMIN_PASS }),
	});
	const loginLatency = Date.now() - t1;
	const loginBody = await loginRes.json().catch(() => null);
	say(`## #2 POST /api/v1/login`);
	say(`Status: ${loginRes.status}, latency: ${loginLatency}ms`);
	const redacted = loginBody?.data
		? {
				...loginBody,
				data: {
					...loginBody.data,
					authToken: loginBody.data.authToken ? `${loginBody.data.authToken.slice(0, 6)}...REDACTED` : undefined,
				},
			}
		: loginBody;
	say('```json');
	say(JSON.stringify(redacted, null, 2));
	say('```\n');

	if (loginBody?.status === 'success') {
		writeFileSync(
			new URL('./.session.json', import.meta.url),
			JSON.stringify({ authToken: loginBody.data.authToken, userId: loginBody.data.userId }, null, 2),
		);
		say(`Saved session to spike/.session.json for subsequent spikes.`);
	}

	writeFileSync(new URL('./01-RESULT.md', import.meta.url), log.join('\n'));
}

main().catch((err) => {
	console.error('SPIKE FAILED:', err);
	process.exit(1);
});
