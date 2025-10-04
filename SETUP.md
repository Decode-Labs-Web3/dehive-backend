# Dehive Backend Setup Guide

## 🚀 Quick Start

### Cách 1: Tự động setup (Khuyến nghị)
```bash
# Sau khi clone/pull code từ git, chỉ cần:
npm install
# Script sẽ tự động build và setup
```

### Cách 2: Script khởi động nhanh
```bash
# Chạy script bash (Linux/Mac)
./start.sh

# Hoặc trên Windows
npm run start:all:setup
```

### Cách 3: Manual setup
```bash
# 1. Cài đặt dependencies và build
npm run setup

# 2. Chạy tất cả services
npm run start:all
```

## 📋 Available Scripts

### Setup & Build
- `npm run setup` - Cài đặt dependencies và build project
- `npm run build` - Build project

### Start Services
- `npm run start:all` - Chạy tất cả services (auth, user-dehive-server, server, channel-messaging, direct-messaging)
- `npm run start:all:bg` - Chạy tất cả services (background mode)
- `npm run start:all:setup` - Setup + chạy tất cả services

### Stop Services
- `npm run kill:all` - Dừng tất cả services
- `npm run restart:all` - Restart tất cả services

### Individual Services
- `npm run start:dev auth` - Chạy auth service (port 4006)
- `npm run start:dev user-dehive-server` - Chạy user-dehive-server (port 4001)
- `npm run start:dev server` - Chạy server service (port 4002)
- `npm run start:dev channel-messaging` - Chạy channel-messaging (port 4003)
- `npm run start:dev direct-messaging` - Chạy direct-messaging (port 4004)

## 🔧 Services & Ports

| Service | Port | Description |
|---------|------|-------------|
| auth | 4006 | Authentication service |
| user-dehive-server | 4001 | User management & server memberships |
| server | 4002 | Server management |
| channel-messaging | 4003 | Channel messaging |
| direct-messaging | 4004 | Direct messaging |

## ⚠️ Troubleshooting

### Lỗi "Cannot find module" trong dist folder:
```bash
# Giải pháp: Build lại project
npm run build
```

### Lỗi port đã được sử dụng:
```bash
# Kill tất cả services và chạy lại
npm run kill:all
npm run start:all
```

### Lỗi dependencies:
```bash
# Cài đặt lại dependencies
npm install
npm run build
```

## 🎯 Development Workflow

1. **Lần đầu setup:**
   ```bash
   npm run start:all:setup
   ```

2. **Hàng ngày:**
   ```bash
   npm run start:all
   ```

3. **Khi có lỗi:**
   ```bash
   npm run kill:all
   npm run build
   npm run start:all
   ```
