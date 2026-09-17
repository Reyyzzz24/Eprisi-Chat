// GATE 1, spikes #4-6: rooms.get / subscriptions.get, channels.history, chat.sendMessage
import { readFileSync, writeFileSync } from 'node:fs';

import { BASE_URL } from './config.ts';

const { authToken, userId } = JSON.parse(readFileSync(new URL('./.session.json', import.meta.url), 'utf-8'));

const log: string[] = [];
const say = (s: string) => {
	console.log(s);
	log.push(s);
};

const authHeaders = {
	'Content-Type': 'application/json',
	'X-Auth-Token': authToken,
	'X-User-Id': userId,
};

async function get(path: string) {
	const t0 = Date.now();
	const res = await fetch(`${BASE_URL}${path}`, { headers: authHeaders });
	const latency = Date.now() - t0;
	const json = await res.json().catch(() => null);
	return { status: res.status, latency, json };
}

async function post(path: string, body: unknown) {
	const t0 = Date.now();
	const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers: authHeaders, body: JSON.stringify(body) });
	const latency = Date.now() - t0;
	const json = await res.json().catch(() => null);
	return { status: res.status, latency, json };
}

async function main() {
	say(`# Spike 04 — rooms, history, send message\n`);

	// #4a — rooms.get
	const rooms = await get('/api/v1/rooms.get');
	say(`## #4a GET /api/v1/rooms.get`);
	say(`Status: ${rooms.status}, latency: ${rooms.latency}ms`);
	say(`Room count: ${rooms.json?.update?.length ?? 'n/a'}`);
	say('```json');
	say(JSON.stringify(rooms.json?.update?.slice(0, 2) ?? rooms.json, null, 2));
	say('```\n');

	// #4b — subscriptions.get
	const subs = await get('/api/v1/subscriptions.get');
	say(`## #4b GET /api/v1/subscriptions.get`);
	say(`Status: ${subs.status}, latency: ${subs.latency}ms`);
	say(`Subscription count: ${subs.json?.update?.length ?? 'n/a'}`);
	say('```json');
	say(JSON.stringify(subs.json?.update?.slice(0, 2) ?? subs.json, null, 2));
	say('```\n');

	const generalRoom = rooms.json?.update?.find((r: any) => r.name === 'general');
	if (!generalRoom) {
		say(`**BLOCKED**: no #general room found in rooms.get response — cannot test history/send.`);
		writeFileSync(new URL('./04-RESULT.md', import.meta.url), log.join('\n'));
		return;
	}
	say(`Using room \`#general\` (rid: \`${generalRoom._id}\`) for #5/#6.\n`);

	// #5 — channels.history
	const history = await get(`/api/v1/channels.history?roomName=general&count=5`);
	say(`## #5 GET /api/v1/channels.history?roomName=general&count=5`);
	say(`Status: ${history.status}, latency: ${history.latency}ms`);
	say(`Message count returned: ${history.json?.messages?.length ?? 'n/a'}`);
	say('```json');
	say(JSON.stringify(history.json?.messages?.slice(0, 2) ?? history.json, null, 2));
	say('```\n');

	// #6 — chat.sendMessage
	const sendBody = { message: { rid: generalRoom._id, msg: `spike-test-message ${new Date().toISOString()}` } };
	const sent = await post('/api/v1/chat.sendMessage', sendBody);
	say(`## #6 POST /api/v1/chat.sendMessage`);
	say(`Request: \`${JSON.stringify(sendBody)}\``);
	say(`Status: ${sent.status}, latency: ${sent.latency}ms`);
	say('```json');
	say(JSON.stringify(sent.json, null, 2));
	say('```\n');

	writeFileSync(new URL('./04-RESULT.md', import.meta.url), log.join('\n'));
}

main().catch((err) => {
	console.error('SPIKE FAILED:', err);
	process.exit(1);
});
