# Spike 11 — upload, avatar/file download, reaction, search

## #11 POST /api/v1/rooms.upload/{rid} (as documented in WRAPPER_PROMPT.md)
Status: 404 — **404, does not exist at this path**

> Root cause (confirmed in rc-fork source, `server/api/v1/rooms.ts`): the route is registered as `API.v1.addRoute('rooms.media/:rid', ...)` — **`rooms.media`, not `rooms.upload`**. Retested below at the real path.

## #11 (retry) POST /api/v1/rooms.media/{rid} — the actual working path
Status: 200, latency: 56ms
```json
{
  "file": {
    "_id": "6aaacabdc38cccbb65dbfafd",
    "url": "/file-upload/6aaacabdc38cccbb65dbfafd/spike-test.txt"
  },
  "success": true
}
```

File URL from response: `/file-upload/6aaacabdc38cccbb65dbfafd/spike-test.txt`

## #12a GET /avatar/{username}
Status: 200, latency: 6ms, content-type: image/svg+xml

## #12b GET /file-upload/6aaacabdc38cccbb65dbfafd/spike-test.txt (file download, auth via headers not query params)
Status: 200, latency: 21ms, content-type: text/plain
**PASS**

## #13 POST /api/v1/chat.react
Status: 200, latency: 15ms
```json
{
  "success": true
}
```

## #14 GET /api/v1/chat.search
Status: 200, latency: 14ms
Result count: 5
```json
[
  {
    "_id": "Z58yzydnf2hPasJxL",
    "rid": "GENERAL",
    "msg": "spike-react-target",
    "ts": "2026-09-16T16:58:37.697Z",
    "u": {
      "_id": "4zebpbzHBqoZMgidj",
      "username": "eprisiadmin",
      "name": "Eprisi Admin"
    },
    "_updatedAt": "2026-09-16T16:58:37.760Z",
    "md": [
      {
        "type": "PARAGRAPH",
        "value": [
          {
            "type": "PLAIN_TEXT",
            "value": "spike-react-target"
          }
        ]
      }
    ],
    "mentions": [],
    "channels": [],
    "urls": [],
    "reactions": {
      ":thumbsup:": {
        "usernames": [
          "eprisiadmin"
        ]
      }
    },
    "score": 0.6666666666666666
  },
  {
    "_id": "GGzJ7P4fmTdQ9j4DB",
    "rid": "GENERAL",
    "msg": "spike-react-target",
    "ts": "2026-09-16T16:58:09.447Z",
    "u": {
      "_id": "4zebpbzHBqoZMgidj",
      "username": "eprisiadmin",
      "name": "Eprisi Admin"
    },
    "_updatedAt": "2026-09-16T16:58:09.511Z",
    "md": [
      {
        "type": "PARAGRAPH",
        "value": [
          {
            "type": "PLAIN_TEXT",
            "value": "spike-react-target"
          }
        ]
      }
    ],
    "mentions": [],
    "channels": [],
    "urls": [],
    "reactions": {
      ":thumbsup:": {
        "usernames": [
          "eprisiadmin"
        ]
      }
    },
    "score": 0.6666666666666666
  }
]
```
