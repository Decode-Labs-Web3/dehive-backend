# MongoDB Atlas Search - Testing Guide

## Overview
Cả 2 services đã implement đúng MongoDB Atlas Search với các tính năng:
- ✅ **Text search** - Tìm kiếm văn bản
- ✅ **Wildcard search** - Tìm partial match (`*hello*`)
- ✅ **Fuzzy search** - Dung sai lỗi chính tả (1 ký tự sai)
- ✅ **Phrase search** - Tìm cụm từ chính xác
- ✅ **Autocomplete** - Tự động hoàn thành
- ✅ **Score boosting** - Ưu tiên kết quả chính xác hơn
- ✅ **Pagination** - Phân trang kết quả

---

## 📋 Atlas Search Index Setup

### 1. Direct Messaging Search Index

**Collection:** `direct_messages`
**Index Name:** `direct_messages_search`

#### Index Definition (JSON):
```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "content": [
        {
          "type": "string",
          "analyzer": "lucene.standard"
        },
        {
          "type": "autocomplete",
          "analyzer": "lucene.standard",
          "tokenization": "edgeGram",
          "minGrams": 2,
          "maxGrams": 15,
          "foldDiacritics": true
        }
      ],
      "conversationId": {
        "type": "objectId"
      },
      "isDeleted": {
        "type": "boolean"
      },
      "senderId": {
        "type": "objectId"
      },
      "createdAt": {
        "type": "date"
      }
    }
  }
}
```

#### Cách tạo trong Atlas UI:
1. Vào MongoDB Atlas → Database → Browse Collections
2. Chọn collection `direct_messages`
3. Tab **Search Indexes** → **Create Search Index**
4. Chọn **JSON Editor**
5. Paste index definition ở trên
6. Index Name: `direct_messages_search`
7. Click **Create Search Index**

---

### 2. Channel Messaging Search Index

**Collection:** `channel_messages`
**Index Name:** `channel_messages_search`

#### Index Definition (JSON):
```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "content": [
        {
          "type": "string",
          "analyzer": "lucene.standard"
        },
        {
          "type": "autocomplete",
          "analyzer": "lucene.standard",
          "tokenization": "edgeGram",
          "minGrams": 2,
          "maxGrams": 15,
          "foldDiacritics": true
        }
      ],
      "channelId": {
        "type": "objectId"
      },
      "isDeleted": {
        "type": "boolean"
      },
      "senderId": {
        "type": "objectId"
      },
      "createdAt": {
        "type": "date"
      }
    }
  }
}
```

#### Cách tạo trong Atlas UI:
1. Vào MongoDB Atlas → Database → Browse Collections
2. Chọn collection `channel_messages`
3. Tab **Search Indexes** → **Create Search Index**
4. Chọn **JSON Editor**
5. Paste index definition ở trên
6. Index Name: `channel_messages_search`
7. Click **Create Search Index**

---

## 🧪 Testing Plan

### Phase 1: Index Verification
**Mục đích:** Kiểm tra Atlas Search Index đã được tạo và sync đúng chưa

```bash
# Check index status in MongoDB Atlas UI
# Status phải là "Active" và "Queryable"
```

**Expected:**
- ✅ Index status: **Active**
- ✅ Documents indexed: **>0** (số lượng messages trong collection)
- ⏳ Initial sync: 1-5 phút tùy số lượng documents

---

### Phase 2: Direct Messaging Search Tests

#### Test 2.1: Search trong 1 conversation
**Endpoint:** `GET /api/dm/search/conversation/{conversationId}`

**Test Cases:**

**Case A: Exact Match (Tìm chính xác)**
```http
GET http://localhost:4004/api/dm/search/conversation/68e8b59f806fb5c06c6551a3
Headers:
  x-session-id: {session_id}
  x-fingerprint-hashed: {fingerprint}
Query params:
  search=hello
  page=0
  limit=20
```
**Expected:** Tìm messages có từ "hello" (chính xác)

---

**Case B: Partial Match (Tìm một phần)**
```http
GET http://localhost:4004/api/dm/search/conversation/68e8b59f806fb5c06c6551a3
Query params:
  search=hel
  page=0
  limit=20
```
**Expected:** Tìm "hello", "help", "helicopter", etc.

---

**Case C: Fuzzy Match (Lỗi chính tả)**
```http
GET http://localhost:4004/api/dm/search/conversation/68e8b59f806fb5c06c6551a3
Query params:
  search=helo  (thiếu 1 chữ 'l')
  page=0
  limit=20
```
**Expected:** Vẫn tìm thấy "hello" (dung sai 1 ký tự)

---

**Case D: Wildcard (Tìm trong cụm)**
```http
GET http://localhost:4004/api/dm/search/conversation/68e8b59f806fb5c06c6551a3
Query params:
  search=world
  page=0
  limit=20
```
**Expected:** Tìm "hello world", "world cup", "new world", etc.

---

**Case E: Pagination**
```http
GET http://localhost:4004/api/dm/search/conversation/68e8b59f806fb5c06c6551a3
Query params:
  search=test
  page=0
  limit=5

# Then page 1:
  page=1
  limit=5
```
**Expected:**
- Page 0: 5 kết quả đầu tiên
- Page 1: 5 kết quả tiếp theo
- metadata.hasNextPage = true/false

---

#### Test 2.2: Search tất cả conversations của user
**Endpoint:** `GET /api/dm/search/all`

```http
GET http://localhost:4004/api/dm/search/all
Headers:
  x-session-id: {session_id}
  x-fingerprint-hashed: {fingerprint}
Query params:
  search=test
  page=0
  limit=20
```
**Expected:** Tìm trong TẤT CẢ conversations mà user là participant

---

### Phase 3: Channel Messaging Search Tests

#### Test 3.1: Search trong 1 channel
**Endpoint:** `GET /api/messages/search/channel/{channelId}`

**Test Cases:**

**Case A: Exact Match**
```http
GET http://localhost:4003/api/messages/search/channel/67088ce1b7bdd19476e23cdc
Headers:
  x-session-id: {session_id}
  x-fingerprint-hashed: {fingerprint}
Query params:
  search=meeting
  page=0
  limit=20
```

---

**Case B: Autocomplete (Gõ dần)**
```http
GET http://localhost:4003/api/messages/search/channel/67088ce1b7bdd19476e23cdc
Query params:
  search=me
```
**Expected:** Tìm "meeting", "message", "me", etc.

---

**Case C: Phrase Match (Cụm từ)**
```http
GET http://localhost:4003/api/messages/search/channel/67088ce1b7bdd19476e23cdc
Query params:
  search=project update
```
**Expected:** Ưu tiên "project update" (cả cụm) > "project" hoặc "update" riêng lẻ

---

#### Test 3.2: Search trong entire server
**Endpoint:** `GET /api/messages/search/server/{serverId}`

```http
GET http://localhost:4003/api/messages/search/server/68e09f0f8f924bd8b03d957a
Headers:
  x-session-id: {session_id}
  x-fingerprint-hashed: {fingerprint}
Query params:
  search=important
  page=0
  limit=20
```
**Expected:** Tìm trong TẤT CẢ channels của server

---

## ✅ Expected Response Format

### Success Response:
```json
{
  "items": [
    {
      "_id": "670a012b...",
      "conversationId": "68e8b59f...",  // hoặc channelId
      "sender": {
        "dehive_id": "68de3fc3...",
        "username": "test_bot_1",
        "display_name": "Test Bot",
        "avatar_ipfs_hash": "QmT0J..."
      },
      "content": "hello world this is a test message",
      "attachments": [],
      "isEdited": false,
      "isDeleted": false,
      "createdAt": "2025-10-29T12:00:00.000Z",
      "score": 2.8571  // ← Search relevance score
    }
  ],
  "metadata": {
    "page": 0,
    "limit": 20,
    "total": 15,        // Total results
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

### Error Responses:

**Missing search query:**
```json
{
  "statusCode": 400,
  "message": "Search query is required"
}
```

**Invalid ID:**
```json
{
  "statusCode": 400,
  "message": "Invalid conversationId"
}
```

**No results:**
```json
{
  "items": [],
  "metadata": {
    "page": 0,
    "limit": 20,
    "total": 0,
    "totalPages": 0,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

---

## 🔍 Search Scoring Logic

### Score Boosting (cao → thấp):
1. **Exact match** (boost: 3x) - "hello" → "hello"
2. **Wildcard match** (boost: 2x) - "hel" → "hello world"
3. **Fuzzy match** (boost: 1.5x) - "helo" → "hello"
4. **Autocomplete** (boost: 2x) - "pro" → "project"
5. **Phrase match** (boost: 3x) - "hello world" → "hello world"

### Sort Order:
```
1. score (DESC) - Điểm relevance cao nhất
2. createdAt (DESC) - Tin nhắn mới nhất
```

---

## 📊 Performance Expectations

| Scenario | Index Size | Expected Response Time |
|----------|-----------|----------------------|
| < 1,000 messages | < 1 MB | < 100ms |
| 1K - 10K messages | 1-10 MB | 100-300ms |
| 10K - 100K messages | 10-100 MB | 300-500ms |
| > 100K messages | > 100 MB | 500ms - 1s |

**Note:** Atlas Search performs well even with millions of documents!

---

## 🐛 Troubleshooting

### Issue 1: "No results found" (nhưng data có tồn tại)
**Causes:**
- ❌ Index chưa được tạo
- ❌ Index đang sync (status: Building)
- ❌ Index name sai (phải đúng `direct_messages_search` hoặc `channel_messages_search`)

**Fix:**
1. Check index status trong Atlas UI
2. Đợi index sync xong (status: Active)
3. Verify index name trong code

---

### Issue 2: "Search is slow" (> 1 second)
**Causes:**
- ❌ Quá nhiều documents
- ❌ Không dùng filter (conversationId, channelId, isDeleted)
- ❌ Dùng wildcard mà không có filter

**Fix:**
1. Luôn dùng filter cho conversationId/channelId
2. Filter isDeleted = false
3. Dùng pagination (limit nhỏ: 20-50)

---

### Issue 3: "Relevance scores are weird"
**Causes:**
- ❌ Boost values không hợp lý
- ❌ Analyzer không phù hợp với ngôn ngữ

**Fix:**
1. Adjust boost values trong code
2. Test với các query khác nhau
3. Check analyzer trong index definition

---

## 📝 Test Data Preparation

### Create test messages:
```javascript
// Trong Insomnia hoặc Postman
// 1. Send messages với diverse content:

POST http://localhost:4004/api/dm/send
{
  "conversationId": "...",
  "content": "hello world"
}

POST http://localhost:4004/api/dm/send
{
  "conversationId": "...",
  "content": "hello everyone, how are you?"
}

POST http://localhost:4004/api/dm/send
{
  "conversationId": "...",
  "content": "meeting at 3pm today"
}

POST http://localhost:4004/api/dm/send
{
  "conversationId": "...",
  "content": "project update: completed phase 1"
}
```

### Verify index can find them:
```http
GET /api/dm/search/all?search=hello
# Should return 2 results

GET /api/dm/search/all?search=meeting
# Should return 1 result

GET /api/dm/search/all?search=project
# Should return 1 result
```

---

## 🎯 Success Criteria

Search implementation is considered **WORKING** if:

✅ **Index Setup:**
- [ ] Both indexes created in Atlas
- [ ] Both indexes status = "Active"
- [ ] Documents indexed > 0

✅ **Exact Match:**
- [ ] Searching "hello" finds "hello world"
- [ ] Case insensitive (Hello = hello = HELLO)

✅ **Partial Match:**
- [ ] Searching "hel" finds "hello"
- [ ] Searching "pro" finds "project"

✅ **Fuzzy Match:**
- [ ] Searching "helo" finds "hello"
- [ ] Max 1 character difference

✅ **Pagination:**
- [ ] Page 0 returns first N results
- [ ] Page 1 returns next N results
- [ ] metadata.hasNextPage accurate

✅ **Performance:**
- [ ] Response time < 500ms for <10K messages
- [ ] Score sorting works (highest score first)

✅ **Filters:**
- [ ] Only searches in specified conversation/channel
- [ ] Excludes deleted messages (isDeleted=false)
- [ ] User can only search their own conversations

---

## 🚀 Next Steps

1. **Create both Atlas Search Indexes** (5-10 minutes)
2. **Send test messages** with diverse content
3. **Run all test cases** from this guide
4. **Verify response times** and relevance scores
5. **Adjust boost values** if needed
6. **Test with production-like data volume**

Good luck testing! 🎉
