# API Gateway - Dehive Backend

## Tổng quan

API Gateway là một trung gian (middleware) giữa frontend và các microservices. Thay vì frontend phải gọi trực tiếp đến từng service khác nhau, frontend chỉ cần gọi đến API Gateway, và Gateway sẽ tự động route request đến service phù hợp.

## Cách hoạt động

```
Frontend → API Gateway → Microservices
```

### Routing Logic

API Gateway sử dụng URL path để xác định service cần gọi:

- `/auth/*` → Auth Service (localhost:4006)
- `/servers/*` → Server Service (localhost:4002)
- `/memberships/*`, `/profiles/*`, `/invites/*`, `/users/*` → User-Dehive-Server (localhost:4001)
- `/channels/*`, `/messages/*`, `/uploads/*` → Channel Messaging (localhost:4003)
- `/direct/*`, `/conversations/*`, `/dm/*` → Direct Messaging (localhost:4004)

## Endpoints

### Health & Status
- `GET /health` - Kiểm tra trạng thái tất cả services
- `GET /services` - Thông tin chi tiết về các services
- `GET /refresh` - Refresh trạng thái services

### API Routes
Tất cả các routes khác sẽ được proxy đến service tương ứng.

## Cấu hình Services

```typescript
const services = {
  auth: {
    url: 'http://localhost:4006',
    healthEndpoint: '/auth/health',
    timeout: 5000,
    retries: 3
  },
  server: {
    url: 'http://localhost:4002',
    healthEndpoint: '/api/servers/health',
    timeout: 5000,
    retries: 3
  },
  // ... các services khác
};
```

## Tính năng

### 1. Automatic Routing
- Tự động xác định service dựa trên URL path
- Transform path để phù hợp với API của từng service

### 2. Health Monitoring
- Kiểm tra sức khỏe của các services
- Cache kết quả health check (30 giây)
- Retry logic với exponential backoff

### 3. Error Handling
- Xử lý lỗi khi service không available
- Forward response status codes từ services
- Logging chi tiết cho debugging

### 4. Request/Response Processing
- Clean headers trước khi forward
- Forward response headers từ services
- Support tất cả HTTP methods (GET, POST, PUT, PATCH, DELETE)

## Cách chạy

```bash
# Development
npm run start:dev api-gateway

# Production
npm run build api-gateway
node dist/apps/api-gateway/src/main.js
```

## Ports

- **API Gateway**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api/docs

## Ví dụ sử dụng

```bash
# Health check
curl http://localhost:3000/health

# Gọi auth service
curl http://localhost:3000/auth/login

# Gọi server service
curl http://localhost:3000/servers

# Gọi user service
curl http://localhost:3000/memberships
```

## Logs

API Gateway log chi tiết về:
- Request routing
- Service health checks
- Response times
- Errors và retries

Format: `🔄 Routing GET /auth/login → auth /auth/login`
