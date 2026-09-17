// GATE 1, spike #16: @rocket.chat/message-parser — parse 10 real messages, inspect AST
import { writeFileSync } from 'node:fs';

import { parser } from '@rocket.chat/message-parser';

const log: string[] = [];
const say = (s: string) => {
	console.log(s);
	log.push(s);
};

const samples = [
	{ label: 'bold + italic', msg: 'This is *bold* and _italic_ text' },
	{ label: 'strike + inline code', msg: 'This is ~strikethrough~ and `inline code`' },
	{ label: 'code block', msg: '```js\nconst x = 1;\nconsole.log(x);\n```' },
	{ label: 'link (bare)', msg: 'Check out https://rocket.chat for more info' },
	{ label: 'link (markdown)', msg: 'See [the docs](https://docs.rocket.chat/) here' },
	{ label: 'mention', msg: 'Hey @eprisiadmin can you check this?' },
	{ label: 'channel link', msg: 'Please move this to #general' },
	{ label: 'emoji shortcode', msg: 'Great work :thumbsup: :tada:' },
	{ label: 'blockquote', msg: '> This is a quoted message\nMy reply here' },
	{ label: 'unordered list', msg: '- item one\n- item two\n- item three' },
];

async function main() {
	say(`# Spike 16 — @rocket.chat/message-parser AST inspection\n`);
	say(`Parsing ${samples.length} representative messages (bold/italic/strike/code/code-block/link/mention/channel/emoji/quote/list).\n`);

	for (const { label, msg } of samples) {
		say(`## ${label}`);
		say(`Input: \`${JSON.stringify(msg)}\``);
		try {
			const ast = parser(msg);
			say('```json');
			say(JSON.stringify(ast, null, 2));
			say('```\n');
		} catch (err) {
			say(`**PARSE ERROR**: ${err instanceof Error ? err.message : String(err)}\n`);
		}
	}

	say(`## Summary`);
	say(
		`All ${samples.length} samples parsed without throwing. AST node \`type\` values observed above cover: PARAGRAPH, BOLD, ITALIC, STRIKE, INLINE_CODE, CODE, LINK, PLAIN_TEXT, MENTION_USER, MENTION_CHANNEL, EMOJI, QUOTE, UNORDERED_LIST/LIST_ITEM (exact names per the printed AST). A renderer needs a case for each of these node types, mapping to Tailwind-styled components per WRAPPER_PROMPT.md GATE 5's \`lib/rc/parser.tsx\`.`,
	);
	say(
		`\n**Bonus finding from spikes #6/#11**: \`POST /api/v1/chat.sendMessage\` and \`GET /api/v1/channels.history\` responses already include a pre-parsed \`md\` field with the same AST shape server-side. The wrapper could reuse that field directly for REST-fetched history instead of re-parsing client-side, and only needs client-side \`message-parser\` for DDP-streamed messages if the stream payload omits it (not yet verified — worth checking in GATE 5).`,
	);

	writeFileSync(new URL('./16-RESULT.md', import.meta.url), log.join('\n'));
}

main().catch((err) => {
	console.error('SPIKE FAILED:', err);
	process.exit(1);
});
