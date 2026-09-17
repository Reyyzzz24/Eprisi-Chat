// GATE 1, spike #15: rate limit — hammer one endpoint 200x, note when 429 appears
import { readFileSync, writeFileSync } from 'node:fs';

import { BASE_URL } from './config.ts';

const { authToken, userId } = JSON.parse(readFileSync(new URL('./.session.json', import.meta.url), 'utf-8'));

const log: string[] = [];
const say = (s: string) => {
	console.log(s);
	log.push(s);
};

async function main() {
	say(`# Spike 15 — rate limit\n`);
	say(`Hammering GET /api/v1/me 200x sequentially...\n`);

	let first429: number | null = null;
	let total429 = 0;
	const latencies: number[] = [];
	let sample429Headers: Record<string, string> = {};

	for (let i = 1; i <= 200; i++) {
		const t0 = Date.now();
		const res = await fetch(`${BASE_URL}/api/v1/me`, {
			headers: { 'X-Auth-Token': authToken, 'X-User-Id': userId },
		});
		latencies.push(Date.now() - t0);
		if (res.status === 429) {
			total429++;
			if (first429 === null) {
				first429 = i;
				sample429Headers = Object.fromEntries(res.headers.entries());
			}
		}
	}

	say(`## Result`);
	say(`Requests sent: 200`);
	say(`First 429 at request #: ${first429 ?? 'never (no rate limit hit in 200 requests)'}`);
	say(`Total 429s: ${total429}`);
	say(`Latency: min ${Math.min(...latencies)}ms, max ${Math.max(...latencies)}ms, avg ${Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)}ms`);
	if (first429 !== null) {
		say(`\nSample 429 response headers:`);
		say('```json');
		say(JSON.stringify(sample429Headers, null, 2));
		say('```');
	}
	say(
		first429 !== null
			? `\n**Rate limiting IS active** — wrapper needs client-side request coalescing/caching (React Query) or a queue for burst scenarios, per WRAPPER_PROMPT.md GATE 5.`
			: `\n**No rate limit observed** in 200 sequential requests to a single authenticated GET endpoint. Does not rule out limits on other endpoints (e.g. login, which often has stricter brute-force limits) or under concurrent (not sequential) load.`,
	);

	writeFileSync(new URL('./15-RESULT.md', import.meta.url), log.join('\n'));
}

main().catch((err) => {
	console.error('SPIKE FAILED:', err);
	process.exit(1);
});
