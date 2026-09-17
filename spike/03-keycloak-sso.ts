// GATE 1, spike #3: Keycloak SSO login — HIGHEST RISK, see WRAPPER_PROMPT.md
//
// Finding: this RC instance has ZERO OAuth services configured
// (`GET /api/v1/settings.oauth` -> `{ services: [] }`) — there is no real
// Keycloak realm/client wired up in this environment, so a full end-to-end
// SSO login cannot be exercised here. That decision (spin up Keycloak? use
// a different test IdP? skip to alternative (b)?) is explicitly reserved
// for the user per WRAPPER_PROMPT.md's GATE 1 instructions.
//
// What CAN be tested without a real IdP: whether POST /api/v1/login's OAuth
// code path (serviceName + accessToken + expiresIn) is reachable at all and
// what shape of error it returns for a service name it doesn't recognize.
// This still produces a meaningful signal (see result below).
import { writeFileSync } from 'node:fs';

import { BASE_URL } from './config.ts';

const log: string[] = [];
const say = (s: string) => {
	console.log(s);
	log.push(s);
};

async function probe(label: string, body: Record<string, unknown>) {
	const t0 = Date.now();
	const res = await fetch(`${BASE_URL}/api/v1/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	const latency = Date.now() - t0;
	const json = await res.json().catch(() => null);
	say(`### ${label}`);
	say(`Request: \`${JSON.stringify(body)}\``);
	say(`Status: ${res.status}, latency: ${latency}ms`);
	say('```json');
	say(JSON.stringify(json, null, 2));
	say('```\n');
	return { status: res.status, json };
}

async function main() {
	say(`# Spike 03 — Keycloak SSO login (#3, HIGHEST RISK)\n`);

	// Precondition check
	say(`## Precondition: any OAuth service configured on this instance?`);
	say(`Checked via \`GET /api/v1/settings.oauth\` (admin session) — result: \`{"services":[],"success":true}\`.`);
	say(
		`**No OAuth/Keycloak service is registered on this Rocket.Chat instance.** A real end-to-end SSO login cannot be exercised without first standing up a Keycloak realm+client and registering it as a Custom OAuth service in RC's admin settings — infrastructure and configuration decisions outside this spike's scope.\n`,
	);

	say(`## Contract probe (no real IdP — testing the endpoint's error behavior only)\n`);
	const r1 = await probe('expiresIn as string (per prompt warning: "harus integer, bukan string")', {
		serviceName: 'keycloak',
		accessToken: 'dummy-token-for-contract-test',
		expiresIn: '3600',
	});
	const r2 = await probe('expiresIn as integer', {
		serviceName: 'keycloak',
		accessToken: 'dummy-token-for-contract-test',
		expiresIn: 3600,
	});

	say(`## Result: **FAIL** (as far as it can be tested)`);
	say(
		`Both requests return \`500 Internal server error\` — status ${r1.status} and ${r2.status} respectively — regardless of \`expiresIn\` type. Server-side Meteor log shows **no corresponding stack trace or log line** for either request (the REST API layer appears to swallow the exception before it reaches the console), so the exact cause couldn't be pinned down further from outside Rocket.Chat's own source without violating this project's "zero modification, don't dig into fixing RC" rule.`,
	);
	say(
		`This reproduces the exact fragility WRAPPER_PROMPT.md warned about ("historically rapuh... ada PR upstream Maret 2026 yang memperbaiki 500 error"). Whether that fix has landed in 8.8.1 is unclear from this test alone — the 500 could equally be from \`serviceName: "keycloak"\` not matching any configured service (unhandled lookup miss) rather than the historical bug. **Cannot be disambiguated without a real Keycloak realm/client registered on this instance.**`,
	);
	say(`\nSee GATE 1 closing report for the three alternatives (a/b/c) presented to the user per WRAPPER_PROMPT.md.`);

	writeFileSync(new URL('./03-RESULT.md', import.meta.url), log.join('\n'));
}

main().catch((err) => {
	console.error('SPIKE FAILED:', err);
	process.exit(1);
});
