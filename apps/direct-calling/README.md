# Direct Calling Service

A comprehensive 1:1 video/audio calling service built with NestJS, WebRTC, and Socket.IO for real-time communication.

> **✨ New Feature**: Service tự động tạo system messages trong conversation khi call kết thúc, giống Discord! Xem [CALL_MESSAGES.md](./CALL_MESSAGES.md) để biết thêm chi tiết.

## Features

### Core Functionality
- **1:1 Video/Audio Calls**: Full WebRTC support for peer-to-peer communication
- **Real-time Signaling**: Socket.IO namespace `/rtc` for WebRTC offer/answer/ICE candidate exchange
- **Call Management**: Start, accept, decline, and end calls with proper state management
- **Media Controls**: Toggle audio/video on/off during calls
- **Call History**: Track and retrieve call logs with duration and status

### Anti-Abuse Features
- **Double-call Protection**: Prevents multiple simultaneous calls from the same user
- **Call Timeout**: Automatic call termination after 30 seconds if not answered
- **Rate Limiting**: Limits call frequency to prevent spam
- **Connection Monitoring**: Handles user disconnections gracefully

### Technical Features
- **TURN Server Support**: Ephemeral HMAC credentials for Coturn integration
- **ICE Server Configuration**: STUN/TURN server discovery for NAT traversal
- **Session Management**: Redis-based session tracking and caching
- **MongoDB Persistence**: Call logs, RTC sessions, and conversation tracking
- **Authentication**: Session-based auth with Redis caching

## API Endpoints

### Call Management
- `POST /api/calls/start` - Start a new call
- `POST /api/calls/accept` - Accept an incoming call
- `POST /api/calls/decline` - Decline an incoming call
- `POST /api/calls/end` - End an active call
- `GET /api/calls/active` - Get current active call
- `GET /api/calls/history` - Get call history

### TURN/ICE Configuration
- `GET /api/turn/credentials` - Get TURN server credentials
- `GET /api/turn/ice-servers` - Get ICE servers configuration

## WebSocket Events

### Client → Server Events
- `identity` - Authenticate user with session
- `startCall` - Initiate a call to another user
- `acceptCall` - Accept an incoming call
- `declineCall` - Decline an incoming call
- `endCall` - End the current call
- `signalOffer` - Send WebRTC offer
- `signalAnswer` - Send WebRTC answer
- `iceCandidate` - Send ICE candidate
- `toggleMedia` - Toggle audio/video state

### Server → Client Events
- `identityConfirmed` - Authentication successful
- `incomingCall` - New call notification
- `callStarted` - Call initiation confirmed
- `callAccepted` - Call acceptance confirmed
- `callDeclined` - Call declined notification
- `callEnded` - Call termination notification
- `signalOffer` - WebRTC offer received
- `signalAnswer` - WebRTC answer received
- `iceCandidate` - ICE candidate received
- `mediaToggled` - Media state change notification
- `error` - Error notifications

## Environment Variables

```env
# Service Configuration
DIRECT_CALLING_PORT=4005
CLOUD_HOST=localhost

# Database
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=dehive

# Redis
REDIS_URL=redis://localhost:6379

# Authentication Service
DECODE_API_GATEWAY_HOST=localhost
DECODE_API_GATEWAY_PORT=3000

# TURN Server (Optional)
TURN_HOST=localhost
TURN_PORT=3478
TURN_SECRET=your-turn-secret
```

## Database Schemas

### DmCall
- Call metadata and status tracking
- Media state management (audio/video enabled/muted)
- Call duration and quality metrics
- Anti-abuse flags and metadata

### RtcSession
- WebRTC session management
- ICE candidate storage
- Connection state tracking
- Media state synchronization

### DirectConversation
- Shared with direct messaging service
- User relationship management
- Conversation metadata

## Usage Examples

### Starting a Call
```typescript
// WebSocket
socket.emit('startCall', {
  target_user_id: '507f1f77bcf86cd799439011',
  with_video: true,
  with_audio: true
});

// REST API
POST /api/calls/start
{
  "target_user_id": "507f1f77bcf86cd799439011",
  "with_video": true,
  "with_audio": true
}
```

### WebRTC Signaling
```typescript
// Send offer
socket.emit('signalOffer', {
  call_id: '507f1f77bcf86cd799439011',
  offer: 'v=0\r\no=- 1234567890...',
  metadata: { type: 'offer' }
});

// Send answer
socket.emit('signalAnswer', {
  call_id: '507f1f77bcf86cd799439011',
  answer: 'v=0\r\no=- 1234567890...',
  metadata: { type: 'answer' }
});

// Send ICE candidate
socket.emit('iceCandidate', {
  call_id: '507f1f77bcf86cd799439011',
  candidate: 'candidate:1 1 UDP 2113667326...',
  sdpMLineIndex: 0,
  sdpMid: 'audio'
});
```

### Media Controls
```typescript
// Toggle audio
socket.emit('toggleMedia', {
  call_id: '507f1f77bcf86cd799439011',
  media_type: 'audio',
  state: 'muted'
});

// Toggle video
socket.emit('toggleMedia', {
  call_id: '507f1f77bcf86cd799439011',
  media_type: 'video',
  state: 'disabled'
});
```

## Development

### Start the Service
```bash
# Development mode
npm run start:dev:direct-calling

# Production mode
npm run start:prod
```

### Build
```bash
npm run build direct-calling
```

### Swagger Documentation
- Available at: `http://localhost:4005/api-dc-docs`
- WebSocket namespace: `/rtc`

## Architecture

The service follows a microservice architecture with:
- **Controller Layer**: REST API endpoints for call management
- **Service Layer**: Business logic and data persistence
- **Gateway Layer**: WebSocket real-time communication
- **Schema Layer**: MongoDB document models
- **Guard Layer**: Authentication and authorization

## Security Features

- Session-based authentication with Redis caching
- Rate limiting and anti-abuse protection
- Input validation and sanitization
- Secure TURN credential generation
- Connection state monitoring

## Performance Optimizations

- Redis caching for user profiles and session data
- Efficient MongoDB queries with proper indexing
- WebSocket connection pooling
- Automatic cleanup of expired sessions
- Optimized ICE candidate handling

## Future Enhancements

- Screen sharing support
- Group calling capabilities
- Call recording and playback
- Advanced media quality controls
- Push notifications for missed calls
- Call analytics and reporting
