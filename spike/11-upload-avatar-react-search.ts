// GATE 1, spikes #11-14: upload, avatar/file download, reaction, search
import { readFileSync, writeFileSync } from 'node:fs';

import { BASE_URL } from './config.ts';

const { authToken, userId } = JSON.parse(readFileSync(new URL('./.session.json', import.meta.url), 'utf-8'));

const log: string[] = [];
const say = (s: string) => {
	console.log(s);
	log.push(s);
};

const authHeaders = { 'X-Auth-Token': authToken, 'X-User-Id': userId };

async function main() {
	say(`# Spike 11 — upload, avatar/file download, reaction, search\n`);

	// #11 — rooms.upload (as documented in WRAPPER_PROMPT.md) — DISCREPANCY FOUND
	say(`## #11 POST /api/v1/rooms.upload/{rid} (as documented in WRAPPER_PROMPT.md)`);
	const probe = await fetch(`${BASE_URL}/api/v1/rooms.upload/GENERAL`, { method: 'POST', headers: authHeaders });
	say(`Status: ${probe.status} — **404, does not exist at this path**`);
	say(
		`\n> Root cause (confirmed in rc-fork source, \`server/api/v1/rooms.ts\`): the route is registered as \`API.v1.addRoute('rooms.media/:rid', ...)\` — **\`rooms.media\`, not \`rooms.upload\`**. Retested below at the real path.\n`,
	);

	const fileContent = Buffer.from('spike test file content — GATE 1');
	const form = new FormData();
	form.append('file', new Blob([fileContent], { type: 'text/plain' }), 'spike-test.txt');
	const t0 = Date.now();
	const uploadRes = await fetch(`${BASE_URL}/api/v1/rooms.media/GENERAL`, {
		method: 'POST',
		headers: authHeaders, // no Content-Type — let fetch set the multipart boundary
		body: form,
	});
	say(`## #11 (retry) POST /api/v1/rooms.media/{rid} — the actual working path`);
	const uploadLatency = Date.now() - t0;
	const uploadBody = await uploadRes.json().catch(() => null);
	say(`Status: ${uploadRes.status}, latency: ${uploadLatency}ms`);
	say('```json');
	say(JSON.stringify(uploadBody, null, 2));
	say('```\n');

	const fileUrl: string | undefined = uploadBody?.file?.url;
	say(`File URL from response: \`${fileUrl}\`\n`);

	// #12a — avatar download
	say(`## #12a GET /avatar/{username}`);
	const t1 = Date.now();
	const avatarRes = await fetch(`${BASE_URL}/avatar/eprisiadmin`, { headers: authHeaders });
	say(`Status: ${avatarRes.status}, latency: ${Date.now() - t1}ms, content-type: ${avatarRes.headers.get('content-type')}\n`);

	// #12b — file download (using the URL returned by upload, with auth headers — NOT query params, per WRAPPER_PROMPT.md's explicit warning)
	if (fileUrl) {
		say(`## #12b GET ${fileUrl} (file download, auth via headers not query params)`);
		const t2 = Date.now();
		const fileRes = await fetch(`${BASE_URL}${fileUrl}`, { headers: authHeaders });
		say(`Status: ${fileRes.status}, latency: ${Date.now() - t2}ms, content-type: ${fileRes.headers.get('content-type')}`);
		say(fileRes.status === 200 ? `**PASS**\n` : `**FAIL** — check whether this file route needs \`rc_uid\`/\`rc_token\` query params instead (WRAPPER_PROMPT.md explicitly says not to use those — if headers alone don't work, that's a real constraint to report).\n`);
	} else {
		say(`## #12b SKIPPED — no file URL returned by #11\n`);
	}

	// #13 — chat.react
	say(`## #13 POST /api/v1/chat.react`);
	// React to the message sent in spike 04 isn't guaranteed to still be the last one; send a fresh one to react to.
	const sendRes = await fetch(`${BASE_URL}/api/v1/chat.sendMessage`, {
		method: 'POST',
		headers: { ...authHeaders, 'Content-Type': 'application/json' },
		body: JSON.stringify({ message: { rid: 'GENERAL', msg: 'spike-react-target' } }),
	}).then((r) => r.json());
	const msgId = sendRes?.message?._id;
	const t3 = Date.now();
	const reactRes = await fetch(`${BASE_URL}/api/v1/chat.react`, {
		method: 'POST',
		headers: { ...authHeaders, 'Content-Type': 'application/json' },
		body: JSON.stringify({ messageId: msgId, emoji: ':thumbsup:' }),
	});
	const reactLatency = Date.now() - t3;
	const reactBody = await reactRes.json().catch(() => null);
	say(`Status: ${reactRes.status}, latency: ${reactLatency}ms`);
	say('```json');
	say(JSON.stringify(reactBody, null, 2));
	say('```\n');

	// #14 — chat.search
	say(`## #14 GET /api/v1/chat.search`);
	const t4 = Date.now();
	const searchRes = await fetch(`${BASE_URL}/api/v1/chat.search?roomId=GENERAL&searchText=spike`, { headers: authHeaders });
	const searchLatency = Date.now() - t4;
	const searchBody = await searchRes.json().catch(() => null);
	say(`Status: ${searchRes.status}, latency: ${searchLatency}ms`);
	say(`Result count: ${searchBody?.messages?.length ?? 'n/a'}`);
	say('```json');
	say(JSON.stringify(searchBody?.messages?.slice(0, 2) ?? searchBody, null, 2));
	say('```\n');

	writeFileSync(new URL('./11-RESULT.md', import.meta.url), log.join('\n'));
}

main().catch((err) => {
	console.error('SPIKE FAILED:', err);
	process.exit(1);
});
