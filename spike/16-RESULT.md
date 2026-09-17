# Spike 16 — @rocket.chat/message-parser AST inspection

Parsing 10 representative messages (bold/italic/strike/code/code-block/link/mention/channel/emoji/quote/list).

## bold + italic
Input: `"This is *bold* and _italic_ text"`
```json
[
  {
    "type": "PARAGRAPH",
    "value": [
      {
        "type": "PLAIN_TEXT",
        "value": "This is "
      },
      {
        "type": "BOLD",
        "value": [
          {
            "type": "PLAIN_TEXT",
            "value": "bold"
          }
        ]
      },
      {
        "type": "PLAIN_TEXT",
        "value": " and "
      },
      {
        "type": "ITALIC",
        "value": [
          {
            "type": "PLAIN_TEXT",
            "value": "italic"
          }
        ]
      },
      {
        "type": "PLAIN_TEXT",
        "value": " text"
      }
    ]
  }
]
```

## strike + inline code
Input: `"This is ~strikethrough~ and `inline code`"`
```json
[
  {
    "type": "PARAGRAPH",
    "value": [
      {
        "type": "PLAIN_TEXT",
        "value": "This is "
      },
      {
        "type": "STRIKE",
        "value": [
          {
            "type": "PLAIN_TEXT",
            "value": "strikethrough"
          }
        ]
      },
      {
        "type": "PLAIN_TEXT",
        "value": " and "
      },
      {
        "type": "INLINE_CODE",
        "value": {
          "type": "PLAIN_TEXT",
          "value": "inline code"
        }
      }
    ]
  }
]
```

## code block
Input: `"```js\nconst x = 1;\nconsole.log(x);\n```"`
```json
[
  {
    "type": "CODE",
    "language": "js",
    "value": [
      {
        "type": "CODE_LINE",
        "value": {
          "type": "PLAIN_TEXT",
          "value": "const x = 1;"
        }
      },
      {
        "type": "CODE_LINE",
        "value": {
          "type": "PLAIN_TEXT",
          "value": "console.log(x);"
        }
      }
    ]
  }
]
```

## link (bare)
Input: `"Check out https://rocket.chat for more info"`
```json
[
  {
    "type": "PARAGRAPH",
    "value": [
      {
        "type": "PLAIN_TEXT",
        "value": "Check out "
      },
      {
        "type": "LINK",
        "value": {
          "src": {
            "type": "PLAIN_TEXT",
            "value": "https://rocket.chat"
          },
          "label": [
            {
              "type": "PLAIN_TEXT",
              "value": "https://rocket.chat"
            }
          ]
        }
      },
      {
        "type": "PLAIN_TEXT",
        "value": " for more info"
      }
    ]
  }
]
```

## link (markdown)
Input: `"See [the docs](https://docs.rocket.chat/) here"`
```json
[
  {
    "type": "PARAGRAPH",
    "value": [
      {
        "type": "PLAIN_TEXT",
        "value": "See "
      },
      {
        "type": "LINK",
        "value": {
          "src": {
            "type": "PLAIN_TEXT",
            "value": "https://docs.rocket.chat/"
          },
          "label": [
            {
              "type": "PLAIN_TEXT",
              "value": "the docs"
            }
          ]
        }
      },
      {
        "type": "PLAIN_TEXT",
        "value": " here"
      }
    ]
  }
]
```

## mention
Input: `"Hey @eprisiadmin can you check this?"`
```json
[
  {
    "type": "PARAGRAPH",
    "value": [
      {
        "type": "PLAIN_TEXT",
        "value": "Hey "
      },
      {
        "type": "MENTION_USER",
        "value": {
          "type": "PLAIN_TEXT",
          "value": "eprisiadmin"
        }
      },
      {
        "type": "PLAIN_TEXT",
        "value": " can you check this?"
      }
    ]
  }
]
```

## channel link
Input: `"Please move this to #general"`
```json
[
  {
    "type": "PARAGRAPH",
    "value": [
      {
        "type": "PLAIN_TEXT",
        "value": "Please move this to "
      },
      {
        "type": "MENTION_CHANNEL",
        "value": {
          "type": "PLAIN_TEXT",
          "value": "general"
        }
      }
    ]
  }
]
```

## emoji shortcode
Input: `"Great work :thumbsup: :tada:"`
```json
[
  {
    "type": "PARAGRAPH",
    "value": [
      {
        "type": "PLAIN_TEXT",
        "value": "Great work "
      },
      {
        "type": "EMOJI",
        "value": {
          "type": "PLAIN_TEXT",
          "value": "thumbsup"
        },
        "shortCode": "thumbsup"
      },
      {
        "type": "PLAIN_TEXT",
        "value": " "
      },
      {
        "type": "EMOJI",
        "value": {
          "type": "PLAIN_TEXT",
          "value": "tada"
        },
        "shortCode": "tada"
      }
    ]
  }
]
```

## blockquote
Input: `"> This is a quoted message\nMy reply here"`
```json
[
  {
    "type": "QUOTE",
    "value": [
      {
        "type": "PARAGRAPH",
        "value": [
          {
            "type": "PLAIN_TEXT",
            "value": "This is a quoted message"
          }
        ]
      }
    ]
  },
  {
    "type": "PARAGRAPH",
    "value": [
      {
        "type": "PLAIN_TEXT",
        "value": "My reply here"
      }
    ]
  }
]
```

## unordered list
Input: `"- item one\n- item two\n- item three"`
```json
[
  {
    "type": "UNORDERED_LIST",
    "value": [
      {
        "type": "LIST_ITEM",
        "value": [
          {
            "type": "PLAIN_TEXT",
            "value": "item one"
          }
        ]
      },
      {
        "type": "LIST_ITEM",
        "value": [
          {
            "type": "PLAIN_TEXT",
            "value": "item two"
          }
        ]
      },
      {
        "type": "LIST_ITEM",
        "value": [
          {
            "type": "PLAIN_TEXT",
            "value": "item three"
          }
        ]
      }
    ]
  }
]
```

## Summary
All 10 samples parsed without throwing. AST node `type` values observed above cover: PARAGRAPH, BOLD, ITALIC, STRIKE, INLINE_CODE, CODE, LINK, PLAIN_TEXT, MENTION_USER, MENTION_CHANNEL, EMOJI, QUOTE, UNORDERED_LIST/LIST_ITEM (exact names per the printed AST). A renderer needs a case for each of these node types, mapping to Tailwind-styled components per WRAPPER_PROMPT.md GATE 5's `lib/rc/parser.tsx`.

**Bonus finding from spikes #6/#11**: `POST /api/v1/chat.sendMessage` and `GET /api/v1/channels.history` responses already include a pre-parsed `md` field with the same AST shape server-side. The wrapper could reuse that field directly for REST-fetched history instead of re-parsing client-side, and only needs client-side `message-parser` for DDP-streamed messages if the stream payload omits it (not yet verified — worth checking in GATE 5).