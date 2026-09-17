# Spike 07 — DDP connect, subscribe, notify streams, typing

WS URL: ws://localhost:3000

## #7a DDPSDK.createAndConnect
Connected in 55ms

## #7b account.loginWithToken
Logged in as uid `4zebpbzHBqoZMgidj` in 48ms
```json
{
  "id": "4zebpbzHBqoZMgidj",
  "tokenExpires": {
    "$date": 1797353101029
  }
}
```

## #7c stream('room-messages', rid, cb) — verify callback fires on a REST-sent message
Sent REST message: `spike-ddp-test 2026-09-16T16:54:16.318Z`
**PASS** — DDP callback fired with the matching message within 8s.
```json
{
  "_id": "GoXnPxJcEkvDzHA6Y",
  "rid": "GENERAL",
  "msg": "spike-ddp-test 2026-09-16T16:54:16.318Z",
  "ts": {
    "$date": 1789577656451
  },
  "u": {
    "_id": "4zebpbzHBqoZMgidj",
    "username": "eprisiadmin",
    "name": "Eprisi Admin"
  },
  "_updatedAt": {
    "$date": 1789577656471
  },
  "md": [
    {
      "type": "PARAGRAPH",
      "value": [
        {
          "type": "PLAIN_TEXT",
          "value": "spike-ddp-test 2026-09-16T16:54:16.318Z"
        }
      ]
    }
  ],
  "mentions": [],
  "channels": [],
  "urls": []
}
```

## #9 stream-notify-user/<uid>/subscriptions-changed, rooms-changed, notification
Triggered via `channels.create` (rid: 6aaac9b9c38cccbb65dbfaf5):
```json
{
  "subscriptions-changed": [
    "inserted",
    {
      "_id": "6aaac9b9c38cccbb65dbfaf6",
      "open": true,
      "alert": false,
      "unread": 0,
      "userMentions": 0,
      "groupMentions": 0,
      "ts": {
        "$date": 1789577657126
      },
      "rid": "6aaac9b9c38cccbb65dbfaf5",
      "name": "spike-notify-test-1789577657105",
      "fname": "spike-notify-test-1789577657105",
      "t": "c",
      "u": {
        "_id": "4zebpbzHBqoZMgidj",
        "username": "eprisiadmin",
        "name": "Eprisi Admin"
      },
      "ls": {
        "$date": 1789577657126
      },
      "roles": [
        "owner"
      ],
      "_updatedAt": {
        "$date": 1789577657279
      }
    }
  ],
  "rooms-changed": [
    "inserted",
    {
      "_id": "6aaac9b9c38cccbb65dbfaf5",
      "fname": "spike-notify-test-1789577657105",
      "_updatedAt": {
        "$date": 1789577657299
      },
      "name": "spike-notify-test-1789577657105",
      "t": "c",
      "msgs": 0,
      "usersCount": 1,
      "u": {
        "_id": "4zebpbzHBqoZMgidj",
        "username": "eprisiadmin",
        "name": "Eprisi Admin"
      },
      "ts": {
        "$date": 1789577657126
      },
      "ro": false,
      "default": false,
      "sysMes": true
    }
  ]
}
```
**PASS** — at least one notify-user event fired (subscriptions-changed, rooms-changed).

## #10 stream-notify-room/<rid>/typing
Attempted via DDP method call `stream-notify-room` (not REST — no REST equivalent found in rc-fork source):
```json
null
```
**FAIL / INCONCLUSIVE** — no typing event observed. Could not find a REST endpoint for typing in rc-fork source either.