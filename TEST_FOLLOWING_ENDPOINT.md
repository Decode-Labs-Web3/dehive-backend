# Test Following Endpoint

## Direct Test với Insomnia

### URL
```
GET http://localhost:4004/api/dm/following?page=0&limit=100
```

### Headers (Required!)
```
x-session-id: <YOUR_SESSION_ID>
x-fingerprint-hashed: pasonpctest_pasonpctest_pasonpctest777777
```

### Expected Response
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "user_id_1"
      },
      {
        "id": "user_id_2"
      }
    ],
    "metadata": {
      "page": 0,
      "limit": 100,
      "total": 2,
      "is_last_page": true
    }
  }
}
```

## Possible Issues

### 1. 404 Error - Endpoint not found
**Check:**
- Direct-messaging service running on port 4004?
- Run: `lsof -i :4004`

### 2. 401/403 - Authentication failed
**Check:**
- sessionId is valid (from login response)
- fingerprintHash matches the one used during login
- Session not expired in Redis

### 3. Empty response or null data
**Check:**
- User actually has following relationships
- Decode API is running and accessible

## Debug Steps

### Step 1: Check if service is running
```bash
curl http://localhost:4004/api/dm/following \
  -H "x-session-id: YOUR_SESSION_ID" \
  -H "x-fingerprint-hashed: YOUR_FINGERPRINT" \
  -v
```

### Step 2: Check direct-messaging logs
Look for:
- "GET /api/dm/following" request logs
- Any errors from DecodeApiClient
- Response status codes

### Step 3: Verify sessionId exists in Redis
```bash
redis-cli
> GET session:YOUR_SESSION_ID
```

Should return session data with user info.
