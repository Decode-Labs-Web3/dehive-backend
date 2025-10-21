# Realtime Following Messages Implementation

## 🚀 Overview

This implementation provides real-time updates for the following messages list, similar to popular messaging apps like WhatsApp, Telegram, etc. When a user sends or receives a message, the following messages list is automatically updated and pushed to the frontend.

## 📡 WebSocket Events

### Client → Server Events

#### 1. Subscribe to Following Messages Updates
```javascript
socket.emit('subscribeFollowingMessages');
```

#### 2. Unsubscribe from Following Messages Updates
```javascript
socket.emit('unsubscribeFollowingMessages');
```

### Server → Client Events

#### 1. Following Message Update
```javascript
socket.on('following_message_update', (data) => {
  console.log('Following message update:', data);
  // data structure:
  // {
  //   type: "following_message_update",
  //   data: {
  //     userId: "user_id_here",
  //     updatedUser: {
  //       id: "other_user_id",
  //       conversationid: "conversation_id",
  //       displayname: "User Name",
  //       username: "username",
  //       avatar_ipfs_hash: "hash_or_null",
  //       isActive: true,
  //       isCall: false,
  //       lastMessageAt: "2025-10-21T05:02:03.420Z"
  //     },
  //     action: "message_sent" | "message_received",
  //     timestamp: "2025-10-21T05:02:03.420Z"
  //   }
  // }
});
```

#### 2. Subscription Confirmation
```javascript
socket.on('following_messages_subscribed', (data) => {
  console.log('Successfully subscribed to following messages updates');
});
```

#### 3. Unsubscription Confirmation
```javascript
socket.on('following_messages_unsubscribed', (data) => {
  console.log('Successfully unsubscribed from following messages updates');
});
```

## 🔄 How It Works

### 1. **Message Flow**
```
User A sends message to User B
    ↓
WebSocket Gateway receives message
    ↓
Message is saved to database
    ↓
Message is broadcasted to both users
    ↓
Following message update is triggered
    ↓
Both users receive following_message_update event
    ↓
Frontend updates the following messages list
```

### 2. **Real-time Updates**
- When a message is sent, both sender and receiver get updated following lists
- The user with the most recent message appears at the top
- `isActive` status is updated based on recent activity (within 5 minutes)
- `lastMessageAt` timestamp is updated with the latest message time

## 🎯 Frontend Implementation

### 1. **Connect to WebSocket**
```javascript
const socket = io('ws://localhost:4004');

// Identify user first
socket.emit('identify', { userDehiveId: 'your_user_id' });

// Subscribe to following messages updates
socket.emit('subscribeFollowingMessages');
```

### 2. **Handle Real-time Updates**
```javascript
socket.on('following_message_update', (data) => {
  const { updatedUser, action } = data.data;

  // Update your following messages list
  updateFollowingMessagesList(updatedUser, action);
});

function updateFollowingMessagesList(updatedUser, action) {
  // Remove user from current position
  const currentList = getCurrentFollowingMessagesList();
  const filteredList = currentList.filter(user => user.id !== updatedUser.id);

  // Add user to top of list
  const newList = [updatedUser, ...filteredList];

  // Update UI
  renderFollowingMessagesList(newList);

  // Show notification if needed
  if (action === 'message_received') {
    showNotification(`New message from ${updatedUser.displayname}`);
  }
}
```

### 3. **Unsubscribe on Disconnect**
```javascript
socket.on('disconnect', () => {
  // Clean up subscriptions
  socket.emit('unsubscribeFollowingMessages');
});
```

## 🛠️ Backend Implementation

### 1. **Service Methods**
- `emitFollowingMessageUpdate()` - Triggers real-time updates
- `getFollowingWithMessagesForUser()` - Gets updated following list
- `emitToUserRoomWS()` - Sends WebSocket events

### 2. **Gateway Events**
- `subscribeFollowingMessages` - Client subscription
- `unsubscribeFollowingMessages` - Client unsubscription
- Automatic emission on message send

### 3. **Event Types**
- `FollowingMessageUpdateEvent` - Single user update
- `FollowingMessageListUpdateEvent` - Full list update

## 🔧 Configuration

### Environment Variables
```env
DIRECT_MESSAGING_PORT=4004
```

### WebSocket Connection
```javascript
// Connect to WebSocket
const socket = io('ws://localhost:4004', {
  transports: ['websocket'],
  upgrade: false
});
```

## 📱 User Experience

### 1. **Real-time Updates**
- Following messages list updates instantly when messages are sent/received
- Most recent conversation appears at the top
- Active status shows users who messaged recently

### 2. **Performance**
- Efficient WebSocket events
- Minimal data transfer
- Optimized database queries

### 3. **Reliability**
- Automatic reconnection on disconnect
- Error handling for failed updates
- Fallback to polling if WebSocket fails

## 🚨 Error Handling

### Common Errors
```javascript
socket.on('error', (error) => {
  console.error('WebSocket error:', error);
  // Handle authentication errors, connection issues, etc.
});
```

### Fallback Strategy
```javascript
// If WebSocket fails, fallback to polling
if (!socket.connected) {
  setInterval(() => {
    fetchFollowingMessages(); // Regular API call
  }, 5000); // Poll every 5 seconds
}
```

## 🎉 Benefits

1. **Real-time Experience** - Instant updates like popular messaging apps
2. **Efficient** - Only updates when needed, minimal bandwidth
3. **Scalable** - WebSocket-based, handles many concurrent users
4. **User-friendly** - Automatic sorting, active status, notifications
5. **Reliable** - Error handling and fallback mechanisms

This implementation provides a modern, real-time messaging experience that matches the expectations of users familiar with popular messaging applications.
