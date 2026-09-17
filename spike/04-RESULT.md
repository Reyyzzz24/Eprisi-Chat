# Spike 04 — rooms, history, send message

## #4a GET /api/v1/rooms.get
Status: 200, latency: 73ms
Room count: 1
```json
[
  {
    "_id": "GENERAL",
    "ts": "2026-09-16T08:02:16.846Z",
    "t": "c",
    "name": "general",
    "usernames": [],
    "msgs": 1,
    "usersCount": 1,
    "_updatedAt": "2026-09-16T08:15:54.679Z",
    "u": {
      "_id": "rocket.cat",
      "username": "rocket.cat",
      "name": "Rocket.Cat"
    },
    "default": true
  }
]
```

## #4b GET /api/v1/subscriptions.get
Status: 200, latency: 17ms
Subscription count: 1
```json
[
  {
    "_id": "6aaa503ab91d9b4676cb1936",
    "open": true,
    "alert": false,
    "unread": 0,
    "userMentions": 0,
    "groupMentions": 0,
    "ts": "2026-09-16T08:15:54.648Z",
    "rid": "GENERAL",
    "name": "general",
    "t": "c",
    "u": {
      "_id": "4zebpbzHBqoZMgidj",
      "username": "eprisiadmin",
      "name": "Eprisi Admin"
    },
    "_updatedAt": "2026-09-16T08:15:55.232Z",
    "ls": "2026-09-16T08:15:55.231Z"
  }
]
```

Using room `#general` (rid: `GENERAL`) for #5/#6.

## #5 GET /api/v1/channels.history?roomName=general&count=5
Status: 200, latency: 53ms
Message count returned: 1
```json
[
  {
    "_id": "6aaa503ab91d9b4676cb1937",
    "t": "uj",
    "rid": "GENERAL",
    "ts": "2026-09-16T08:15:54.648Z",
    "msg": "eprisiadmin",
    "u": {
      "_id": "4zebpbzHBqoZMgidj",
      "username": "eprisiadmin",
      "name": "Eprisi Admin"
    },
    "groupable": false,
    "_updatedAt": "2026-09-16T08:15:54.679Z"
  }
]
```

## #6 POST /api/v1/chat.sendMessage
Request: `{"message":{"rid":"GENERAL","msg":"spike-test-message 2026-09-16T16:48:11.135Z"}}`
Status: 200, latency: 183ms
```json
{
  "message": {
    "rid": "GENERAL",
    "msg": "spike-test-message 2026-09-16T16:48:11.135Z",
    "ts": "2026-09-16T16:48:11.152Z",
    "u": {
      "_id": "4zebpbzHBqoZMgidj",
      "username": "eprisiadmin",
      "name": "Eprisi Admin"
    },
    "_id": "yTCGB9rBMfyx3EuuR",
    "_updatedAt": "2026-09-16T16:48:11.249Z",
    "md": [
      {
        "type": "PARAGRAPH",
        "value": [
          {
            "type": "PLAIN_TEXT",
            "value": "spike-test-message 2026-09-16T16:48:11.135Z"
          }
        ]
      }
    ],
    "mentions": [],
    "channels": [],
    "urls": []
  },
  "success": true
}
```
