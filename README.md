# Dehive Backend

Đây là repository backend cho dự án Dehive — một hệ thống chat/voice/video/phức hợp gồm nhiều microservice (NestJS apps) cho các tính năng như channel-messaging, direct-messaging, server (guild) management, user status, gọi thoại, v.v.

Dưới đây là mô tả tổng quan dự án, công nghệ sử dụng, những thay đổi gần đây bạn đã thực hiện, cách chạy và kiểm thử, cũng như các lưu ý triển khai.

## Tổng quan dự án

- Kiến trúc: monorepo chứa nhiều ứng dụng NestJS (apps/*). Mỗi app là một service độc lập (ví dụ `channel-messaging`, `direct-messaging`, `server`, `user-status`, ...).
- Database: MongoDB (Mongoose) cho dữ liệu chính (users, servers, channels, messages, uploads, mapping IPFS).
- Cache/coordination: Redis (ioredis) dùng cho hot-cache (user status, message page cache) và lock nhẹ để tránh race khi upload IPFS.
- Storage: local file fallback + IPFS để lưu media.
- Messaging: Socket.IO / WebSocket gateways cho realtime events.

## Các apps chính (khoảng mục lục)

- `apps/server` – quản lý servers (guilds), avatars, server metadata, events gateway.
- `apps/channel-messaging` – quản lý upload/attachment, channel messages, message cache.
- `apps/direct-messaging` – tương tự cho direct messages (private convo).
- `apps/user-status` – service quản lý trạng thái online/offline của user và set vào Redis.
- `apps/*` khác: gọi thoại, trực tiếp gọi/messaging, etc.

## Công nghệ chính

- Node.js + TypeScript
- NestJS framework
- Mongoose (MongoDB)
- Redis (ioredis) cho cache & locking
- IPFS (HTTP uploader service wrapper)
- Sharp, ffmpeg/ffprobe cho xử lý ảnh/video
- Socket.IO / NestJS Gateway
- ESLint + Prettier

## Những thay đổi bạn đã thực hiện (tóm tắt)

Trong quá trình làm việc, các thay đổi chính đã được triển khai như sau:

1. IPFS deduplication (per-app - "Option B")
   - Mục tiêu: khi nhiều người upload cùng 1 file (byte-identical), tránh upload trùng lên IPFS, tái sử dụng CID đã tồn tại.
   - Cách triển khai chính:
     - Tính SHA-256 của file upload (contentHash).
     - Tra Mongo (Upload / DirectUpload) xem đã có document với contentHash và ipfsHash hay chưa. Nếu có — reuse ipfsHash.
     - Nếu chưa có, acquire Redis lock trên key `ipfs:lock:{contentHash}` (SET ... PX <ttl> NX với retry). Sau khi lock, re-check DB (tránh race), nếu vẫn chưa có: upload lên IPFS, lưu ipfsHash vào document (và lưu contentHash). Cuối cùng release lock.
   - Ứng dụng: `channel-messaging`, `direct-messaging` upload flows đều đã thay đổi để áp dụng dedupe. `server` app tạo thêm `IpfsMapping` schema để reuse avatar uploads across avatars.

2. Server avatars mapping
   - Tạo schema `IpfsMapping` trong `apps/server/src/schemas/ipfs-mapping.schema.ts` để lưu mapping contentHash → ipfsHash + gatewayUrl.
   - Khi tạo/update avatar, compute hash, check mapping, reuse nếu có, hoặc upload và persist mapping.

3. Gateway / event payload changes
   - Điều chỉnh `server-events.gateway.ts` và các notify calls để chuẩn hóa payloads (ví dụ thay đổi kick/ban payload shape và unify member joined/left shapes). (Các chỉnh sửa gateway đã được áp dụng trước đó.)

4. Hot-cache cho user status
   - user-status service set các key `user:status:{id}` trong Redis với TTL để front-end truy xuất nhanh.

5. Lint / typing fixes
   - Nhiều file được chỉnh sửa để xử lý ESLint/TypeScript issues (ví dụ: empty catch bodies chuyển sang `catch (e) { void e; }`, sửa import path). Đồng thời sửa lỗi sử dụng Redis `SET` tham số (NX/PX) để tương thích ioredis typing.

## Danh sách file/điểm đã sửa (điểm chính)

- apps/channel-messaging/
  - `src/services/channel-messaging.service.ts` — thêm logic dedupe: compute sha256, redis lock (ipfs:lock:{hash}), recheck, upload, store contentHash.
  - `schemas/upload.schema.ts` — thêm trường `contentHash` và index unique sparse trên contentHash.

- apps/direct-messaging/
  - `src/services/direct-messaging.service.ts` — tương tự: dedupe bằng sha256 + redis lock + lưu contentHash.
  - `schemas/direct-upload.schema.ts` — thêm `contentHash` và index.

- apps/server/
  - `src/schemas/ipfs-mapping.schema.ts` — new: mapping contentHash → ipfsHash + gatewayUrl.
  - `src/services/server.service.ts` — create/update server avatar flows: compute hash, reuse mapping or upload and persist mapping.
  - `src/server.module.ts` — đăng ký schema mới vào MongooseModule.

- Misc: nhiều file khác đã nhận sửa lỗi lint nhỏ (empty catch, imports) — ví dụ `apps/server/src/services/server.service.ts`.

## Cách dedupe hoạt động (chi tiết kỹ thuật)

- Hashing: SHA-256 trên toàn bộ buffer upload.
- Lookup: MongoDB query tìm document có contentHash + ipfsHash.
- Locking: Redis SET with NX + PX (TTL) để làm mutex nhẹ giữa processes/nodes.
  - Pattern: set lock (NX PX ttl) với retry loop (ví dụ 8 attempts, wait 150ms). Sau khi lock, recheck DB; nếu vẫn chưa có ipfsHash thì upload.
  - Release: DEL key sau khi upload xong.
- Race conditions: recheck DB sau khi có lock để tránh double-upload. DB unique index trên contentHash giúp chặn duplicate inserts — code hiện swallow duplicate-key errors khi tạo mapping (safe-guard).

## Lưu ý vận hành / triển khai

- Chỉ dedupe khi file bytes giống hệt nhau. Nếu bạn cần dedupe "perceptual" (ảnh resize/quality khác), cần giải pháp phức tạp hơn (pHash, perceptual hashing).
- Lock TTL mặc định ~10s — đảm bảo đủ lớn để upload file thường xuyên. Nếu upload file lớn/chậm phải tăng TTL.
- Redis phải là instance dùng chung cho tất cả instances ứng dụng để lock hiệu quả.
- Khi thêm unique index cho `contentHash` trong collection có sẵn, cần đảm bảo migration dữ liệu (xử lý duplicates hiện hữu) trước khi enforce unique index production.

## Cách chạy (dev)

Giả sử bạn đã cài Node.js, MongoDB và Redis:

1. Cài phụ thuộc

```bash
# tại root repo
npm install
```

2. Cấu hình env

- Copy file `.env.example` (nếu có) hoặc set các biến môi trường cần thiết: MONGO_URI, REDIS_URL, STORAGE, IPFS configs, DECODE API keys, v.v.

3. Chạy từng app (hoặc pm2 ecosystem đã có)

Ví dụ chạy một app dev:

```bash
# ví dụ cho channel-messaging
cd apps/channel-messaging
npm run start:dev
```

Ở monorepo bạn có thể dùng scripts ở root để chạy mọi app hoặc dùng pm2 config (`ecosystem.config.js`) để chạy production.

4. Lint + build

```bash
npm run lint
npm run build
```

## Kiểm thử dedupe (manual)

- Cách nhanh: tạo script nhỏ gửi hai request upload cùng buffer gần như đồng thời tới endpoint upload (channel/direct). Kiểm tra logs của IPFSService hoặc network trace để đảm bảo chỉ có 1 POST tới IPFS.
- Gợi ý test script (pseudo):
  - Tạo buffer từ file sample.jpg
  - Promise.all([upload(buffer), upload(buffer)])
  - Kiểm tra kết quả hai responses có cùng `ipfsHash`.

Tôi có thể giúp viết test tự động (jest/integration) nếu bạn muốn.

## Các đề xuất tiếp theo

- Chạy `npm run lint` và `npm run build` toàn repo; fix các cảnh báo còn lại (một số thay đổi trước đó đã xử lý nhiều lỗi, nhưng còn vài chỗ cần format/ESLint fixes).
- Viết test concurrency để chắc chắn lock + re-check hoạt động (mock IPFSService để assert chỉ 1 upload call).
- Xem xét gia tăng TTL lock cho các file lớn hoặc chuyển sang lock mạnh hơn (Redlock) nếu triển khai trên nhiều node phân tán muốn an toàn cao hơn.
- Migration dữ liệu: chạy script làm sạch hoặc merge duplicate uploads trước khi bật index unique trong production.

---

Nếu bạn muốn, tôi sẽ:
- Thêm file README này vào repo (tôi vừa tạo `/README.md`).
- Chạy `npm run lint` + `npm run build` và fix các lỗi tiếp theo.
- Viết kịch bản test concurrency (Jest) và commit test.

Chọn một trong các bước trên để tôi tiếp tục thực hiện.
