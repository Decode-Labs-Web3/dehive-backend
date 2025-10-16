# 🎙️ Hướng dẫn sử dụng Channel Calling Service

## 🎯 Giới thiệu

**Channel Calling** = Voice Channel của Discord
- Nhiều người vào cùng 1 channel
- Mọi người nghe/nhìn thấy nhau
- Join/Leave tự do, không cần "accept"

---

## 🚀 Start Service

### Local Development

```bash
# Start service
npm run start:dev:channel-calling

# Service chạy tại:
# - REST API: http://localhost:4007/api
# - WebSocket: ws://localhost:4007/channel-rtc
# - Swagger: http://localhost:4007/api-cc-docs
```

### Environment Variables

Thêm vào `.env`:

```env
CHANNEL_CALLING_PORT=4007
```

---

## 📡 API Testing với Insomnia

### 1. GET ICE Servers

**URL**: `GET http://localhost:4007/api/channel-turn/ice-servers`

**Headers**: None (public endpoint)

**Response**:
```json
{
  "success": true,
  "data": {
    "iceServers": [
      { "urls": "stun:stun.l.google.com:19302" },
      { "urls": "turn:localhost:3478", "username": "...", "credential": "..." }
    ]
  }
}
```

---

### 2. POST Join Call

**URL**: `POST http://localhost:4007/api/channel-calls/join`

**Headers**:
```
Content-Type: application/json
x-session-id: your-session-id
x-fingerprint-hashed: your-fingerprint
```

**Body**:
```json
{
  "channel_id": "507f1f77bcf86cd799439011",
  "with_video": false,
  "with_audio": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Joined call successfully",
  "data": {
    "call_id": "...",
    "participant_id": "...",
    "status": "active",
    "current_participants": 1,
    "other_participants": []
  }
}
```

---

### 3. GET Active Call in Channel

**URL**: `GET http://localhost:4007/api/channel-calls/channel/:channel_id`

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "channel_id": "...",
    "status": "active",
    "current_participants": 3,
    "participants": [
      { "user_id": { "username": "user1", ... }, "audio_muted": false },
      { "user_id": { "username": "user2", ... }, "video_enabled": true },
      { "user_id": { "username": "user3", ... }, "screen_sharing": false }
    ]
  }
}
```

---

### 4. POST Leave Call

**URL**: `POST http://localhost:4007/api/channel-calls/leave`

**Body**:
```json
{
  "call_id": "507f1f77bcf86cd799439011"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Left call successfully",
  "data": {
    "call_id": "...",
    "status": "active",
    "duration_seconds": 120,
    "remaining_participants": 2
  }
}
```

---

## 🌐 WebSocket Testing

### URL

```
ws://localhost:4007/channel-rtc
```

### Flow for 3 Users

#### **User A:**

1. **Connect & Identity**
```javascript
socket.emit('identity', 'user_a_id');
// → Receive: identityConfirmed
```

2. **Join Call**
```javascript
socket.emit('joinCall', {
  channel_id: 'channel_123',
  with_video: false,
  with_audio: true
});
// → Receive: callJoined
//   { call_id, current_participants: 1, other_participants: [] }
```

---

#### **User B:**

1. **Connect & Identity**
```javascript
socket.emit('identity', 'user_b_id');
```

2. **Join Same Channel**
```javascript
socket.emit('joinCall', {
  channel_id: 'channel_123',
  with_video: false,
  with_audio: true
});
// → Receive: callJoined
//   { call_id, current_participants: 2, other_participants: [User A] }
```

3. **User A receives:**
```javascript
socket.on('userJoined', (data) => {
  // { user_id: 'user_b_id', user_info: {...}, current_participants: 2 }
  // → Create peer connection to User B
});
```

4. **User B creates offer to User A**
```javascript
const pc = new RTCPeerConnection({ iceServers });
const offer = await pc.createOffer();
socket.emit('signalOffer', {
  call_id: 'xxx',
  target_user_id: 'user_a_id',
  offer: offer.sdp
});
```

5. **User A receives offer, sends answer**
```javascript
socket.on('signalOffer', async (data) => {
  // data.from_user_id = 'user_b_id'
  const pc = getPeerConnection(data.from_user_id);
  await pc.setRemoteDescription({ type: 'offer', sdp: data.offer });
  const answer = await pc.createAnswer();
  socket.emit('signalAnswer', {
    call_id: 'xxx',
    target_user_id: 'user_b_id',
    answer: answer.sdp
  });
});
```

---

#### **User C:**

1. **Join**
```javascript
socket.emit('joinCall', { channel_id: 'channel_123' });
// → Receive: other_participants: [User A, User B]
```

2. **Create connections to BOTH A and B**
```javascript
// Offer to A
socket.emit('signalOffer', {
  call_id: 'xxx',
  target_user_id: 'user_a_id',
  offer: 'sdp...'
});

// Offer to B
socket.emit('signalOffer', {
  call_id: 'xxx',
  target_user_id: 'user_b_id',
  offer: 'sdp...'
});
```

3. **A and B both receive `userJoined` → Create connections to C**

**Result**: Full mesh - everyone connected to everyone!

---

## 🎤 Media Controls

```javascript
// Mute mic
socket.emit('toggleMedia', {
  call_id: 'xxx',
  media_type: 'audio',
  state: 'muted'
});

// All users receive:
socket.on('mediaToggled', (data) => {
  // data.user_id, data.media_type, data.state
  // Update UI: Show user is muted
});
```

---

## 🏓 Ping/Pong

```javascript
socket.emit('ping');

socket.on('pong', (data) => {
  // { timestamp, message: 'pong' }
});
```

---

## 📊 Key Differences from Direct Calling

### Direct Calling (1-1)
```javascript
// Start call
socket.emit('startCall', { target_user_id: 'B' });

// B accepts
socket.emit('acceptCall', { call_id: 'xxx' });

// 1 WebRTC connection: A ↔ B
```

### Channel Calling (N-N)
```javascript
// Join channel
socket.emit('joinCall', { channel_id: 'channel_123' });

// No need to accept, auto-join
// Create connections to ALL other users

// 3 users = 3 WebRTC connections:
// A ↔ B
// A ↔ C
// B ↔ C
```

---

## 🔍 Monitoring

**Check active calls:**
```javascript
db.channel_calls.find({ status: 'active' })
```

**Check participants:**
```javascript
db.channel_participants.find({
  call_id: ObjectId('...'),
  status: { $in: ['joining', 'connected'] }
})
```

**Check RTC sessions:**
```javascript
db.channel_rtc_sessions.find({ is_active: true })
```

---

## 🎉 Features

- ✅ Multiple participants (like Discord)
- ✅ Join/Leave anytime
- ✅ WebRTC mesh network
- ✅ Media controls (audio/video)
- ✅ Real-time notifications
- ✅ Participant tracking
- ✅ Auto cleanup
- ✅ TURN/STUN support
- ✅ Scales to 4-6 users comfortably

**Service ready for integration! 🚀**
