# Channel Calling Service (Voice Channel)

Voice channel calling service with WebRTC - like Discord voice channels. Multiple users can join and communicate in real-time.

## 🎯 Overview

**Channel Calling Service** enables **group voice/video calls** in channels, similar to Discord voice channels.

### Key Differences from Direct Calling

| Feature | Direct Calling | Channel Calling |
|---------|----------------|-----------------|
| **Participants** | 2 (1-to-1) | N (many-to-many) |
| **Call Model** | Caller → Callee | Everyone in channel |
| **Join/Leave** | Start → Accept | Join → Leave (anytime) |
| **Use Case** | Private calls | Voice channels in servers |
| **Example** | Discord DM call | Discord voice channel |

---

## 🚀 Features

### Core Functionality
- **Voice Channel Calls**: Multiple participants in one call
- **Join/Leave Anytime**: No need to "accept", just join
- **Real-time Signaling**: WebRTC offer/answer/ICE exchange (mesh network)
- **Media Controls**: Toggle audio/video for each participant
- **Participant Tracking**: See who's in the call
- **Auto Cleanup**: Call ends when last person leaves

### Technical Features
- **TURN Server Support**: NAT traversal for all participants
- **Redis Caching**: Call state and user profiles
- **MongoDB Persistence**: Call history and participant tracking
- **WebSocket**: Real-time notifications (join/leave/media changes)
- **Mesh Network**: P2P connections between all participants

---

## 📡 API Endpoints

### Call Management
- `POST /api/channel-calls/join` - Join voice channel
- `POST /api/channel-calls/leave` - Leave voice channel
- `GET /api/channel-calls/channel/:channel_id` - Get active call in channel
- `GET /api/channel-calls/my-calls` - Get my active calls

### TURN/ICE Configuration
- `GET /api/channel-turn/credentials` - Get TURN credentials
- `GET /api/channel-turn/ice-servers` - Get ICE servers

---

## 🌐 WebSocket Events

**Namespace**: `/channel-rtc`

### Client → Server
- `identity` - Authenticate user
- `joinCall` - Join voice channel
- `leaveCall` - Leave voice channel
- `signalOffer` - Send WebRTC offer to specific user
- `signalAnswer` - Send WebRTC answer to specific user
- `iceCandidate` - Send ICE candidate to specific user
- `toggleMedia` - Toggle audio/video
- `ping` - Ping server

### Server → Client
- `identityConfirmed` - Authentication successful
- `callJoined` - You joined successfully
- `userJoined` - Another user joined
- `callLeft` - You left successfully
- `userLeft` - Another user left
- `signalOffer` - Received WebRTC offer
- `signalAnswer` - Received WebRTC answer
- `iceCandidate` - Received ICE candidate
- `mediaToggled` - Media state changed
- `participantStatusChanged` - Participant status updated
- `pong` - Ping response
- `error` - Error notification

---

## 🗄️ Database Schemas

### ChannelCall
Represents an active voice call in a channel.

```typescript
{
  _id: ObjectId,
  channel_id: ObjectId,      // Which channel
  server_id: ObjectId,       // Which server
  status: String,            // waiting | active | ended
  started_at: Date,
  ended_at: Date,
  duration_seconds: Number,
  current_participants: Number,
  max_participants: Number,
  metadata: Object
}
```

### ChannelParticipant
Tracks individual participants in a call.

```typescript
{
  _id: ObjectId,
  call_id: ObjectId,
  user_id: ObjectId,
  status: String,            // joining | connected | left | disconnected
  joined_at: Date,
  left_at: Date,
  duration_seconds: Number,
  audio_enabled: Boolean,
  video_enabled: Boolean,
  audio_muted: Boolean,
  video_muted: Boolean,
  screen_sharing: Boolean,
  socket_id: String,
  connection_quality: Object,
  metadata: Object
}
```

### ChannelRtcSession
WebRTC session data for each participant.

```typescript
{
  _id: ObjectId,
  call_id: ObjectId,
  user_id: ObjectId,
  session_id: String,
  socket_id: String,
  offers: [String],          // Multiple offers (to different users)
  answers: [String],         // Multiple answers
  ice_candidates: [Object],
  connection_state: String,
  media_state: Object,
  is_active: Boolean,
  ended_at: Date
}
```

---

## 🔄 WebRTC Architecture

**Mesh Network** (Full mesh): Every participant connects to every other participant directly.

```
User A ←→ User B
  ↓  ╲   ╱  ↓
  ↓    ╳    ↓
  ↓  ╱   ╲  ↓
User C ←→ User D
```

**Pros:**
- Low latency (direct P2P)
- No server bandwidth cost

**Cons:**
- CPU/bandwidth intensive (N-1 connections per user)
- Scales poorly (recommended max: 4-6 users)

**Future**: Implement SFU (Selective Forwarding Unit) for better scaling.

---

## 📝 Usage Examples

### Join Voice Channel

**REST API:**
```typescript
POST /api/channel-calls/join
{
  "channel_id": "507f1f77bcf86cd799439011",
  "with_video": false,
  "with_audio": true
}
```

**WebSocket:**
```typescript
socket.emit('joinCall', {
  channel_id: '507f1f77bcf86cd799439011',
  with_video: false,
  with_audio: true
});

// You receive:
socket.on('callJoined', (data) => {
  // data.call_id, data.other_participants
});

// Others receive:
socket.on('userJoined', (data) => {
  // data.user_id, data.user_info
});
```

### WebRTC Signaling (Mesh)

Each user must establish P2P connection with EVERY other user:

```typescript
// User A joins → Sees [User B, User C]
// User A must:
// 1. Create offer for User B
socket.emit('signalOffer', {
  call_id: 'xxx',
  target_user_id: 'B',
  offer: 'sdp...'
});

// 2. Create offer for User C
socket.emit('signalOffer', {
  call_id: 'xxx',
  target_user_id: 'C',
  offer: 'sdp...'
});

// User B and C send answers back
socket.on('signalAnswer', (data) => {
  // data.from_user_id, data.answer
  // Apply answer to corresponding peer connection
});
```

### Leave Voice Channel

```typescript
socket.emit('leaveCall', {
  call_id: 'xxx'
});

// You receive:
socket.on('callLeft', (data) => {
  // Clean up peer connections
});

// Others receive:
socket.on('userLeft', (data) => {
  // Remove user from UI, close peer connection
});
```

---

## ⚙️ Configuration

**Port**: `4007` (default)

**Environment Variables**:
```env
CHANNEL_CALLING_PORT=4007
CLOUD_HOST=localhost
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=dehive
REDIS_URL=redis://localhost:6379
TURN_HOST=localhost
TURN_PORT=3478
TURN_SECRET=your-turn-secret
DECODE_API_GATEWAY_HOST=localhost
DECODE_API_GATEWAY_PORT=3000
```

---

## 🏃 Running the Service

**Development:**
```bash
npm run start:dev:channel-calling
```

**Production:**
```bash
npm run build channel-calling
pm2 start ecosystem.config.js --only channel-calling
```

**Swagger UI:**
```
http://localhost:4007/api-cc-docs
```

**WebSocket:**
```
ws://localhost:4007/channel-rtc
```

---

## 🧪 Testing

### Test Flow

1. **3 users join same channel**
   - User A: `socket.emit('joinCall', { channel_id: 'xxx' })`
   - User B: `socket.emit('joinCall', { channel_id: 'xxx' })`
   - User C: `socket.emit('joinCall', { channel_id: 'xxx' })`

2. **Establish WebRTC connections (mesh)**
   - User A ↔ User B (offer/answer/ICE)
   - User A ↔ User C (offer/answer/ICE)
   - User B ↔ User C (offer/answer/ICE)

3. **Toggle media**
   - Any user: `socket.emit('toggleMedia', { media_type: 'audio', state: 'muted' })`
   - All users receive: `mediaToggled` event

4. **User leaves**
   - User B: `socket.emit('leaveCall', { call_id: 'xxx' })`
   - User A & C receive: `userLeft` event
   - User A & C close peer connection to B

5. **Last user leaves → Call ends**

---

## 🎓 Implementation Notes

### Mesh Network Complexity

**N participants = N × (N-1) / 2 peer connections total**

Examples:
- 2 users: 1 connection
- 3 users: 3 connections
- 4 users: 6 connections
- 5 users: 10 connections
- 10 users: 45 connections

**Recommended limit: 4-6 users** for mesh network.

### Future: SFU Implementation

For better scaling (100+ users), implement SFU (Selective Forwarding Unit):
- Each user sends 1 stream to server
- Server forwards to others
- Much less CPU/bandwidth per user

---

## 🔗 Integration with Frontend

```typescript
// Join voice channel
const socket = io('http://localhost:4007/channel-rtc');

socket.emit('identity', userId);

socket.on('identityConfirmed', () => {
  socket.emit('joinCall', {
    channel_id: channelId,
    with_video: false,
    with_audio: true
  });
});

socket.on('callJoined', async (data) => {
  // Setup local stream
  const localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false
  });

  // Create peer connections to all other participants
  for (const participant of data.other_participants) {
    const pc = new RTCPeerConnection({ iceServers });
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('signalOffer', {
      call_id: data.call_id,
      target_user_id: participant.user_id._id,
      offer: offer.sdp
    });
  }
});

socket.on('userJoined', async (data) => {
  // New user joined, create peer connection
  const pc = new RTCPeerConnection({ iceServers });
  // ... setup WebRTC
});
```

---

## 📊 Comparison with Direct Calling

| Aspect | Direct Calling | Channel Calling |
|--------|----------------|-----------------|
| **Port** | 4005 | 4007 |
| **Namespace** | `/rtc` | `/channel-rtc` |
| **Participants** | 2 (fixed) | N (dynamic) |
| **Start** | `startCall` | `joinCall` |
| **End** | `endCall` | `leaveCall` |
| **WebRTC** | 1 connection | N-1 connections (mesh) |
| **Schema** | DmCall | ChannelCall + Participants |
| **Use Case** | Private 1-1 | Voice channels |

---

## 🎉 Ready for Production

Service is production-ready with:
- ✅ Full WebRTC support (mesh network)
- ✅ Join/Leave mechanics
- ✅ Media controls
- ✅ Participant tracking
- ✅ Auto cleanup
- ✅ TURN/STUN support
- ✅ Redis caching
- ✅ MongoDB persistence
- ✅ Authentication
- ✅ Error handling
