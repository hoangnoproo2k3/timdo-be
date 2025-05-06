# Hướng dẫn Migration Database

## Tổng quan

Dự án đã thiết kế lại cơ sở dữ liệu để hỗ trợ các tính năng mới:
1. Theo dõi lịch sử gói dịch vụ (nâng cấp, gia hạn)
2. Tách biệt tính năng đẩy tin và gói dịch vụ
3. Quản lý thanh toán cho từng loại dịch vụ

## Bước 1: Tạo bản sao lưu

```bash
# Tạo bản sao lưu database
mysqldump -u username -p timdo_database > timdo_backup_$(date +%Y%m%d).sql
```

## Bước 2: Tạo migration

```bash
# Tạo migration file
npx prisma migrate dev --name restructure_subscription_and_boost_system
```

## Bước 3: Chạy seed để tạo các gói dịch vụ mới

```bash
# Chạy script seed
npm run db:seed
```

## Bước 4: Di chuyển dữ liệu

Nếu bạn đã có dữ liệu trong hệ thống cũ, hãy chạy script di chuyển dữ liệu:

```bash
# Chạy script di chuyển dữ liệu
npm run migrate:data
```

## Cấu trúc database mới

### 1. Gói dịch vụ (`ServicePackage`)
- Bổ sung trường `packageType` (BASIC, STANDARD, PREMIUM)
- Loại bỏ các trường liên quan đến đẩy tin

### 2. Đăng ký gói dịch vụ (`PostSubscription`)
- Theo dõi lịch sử nâng cấp/gia hạn gói dịch vụ
- Lưu thông tin về gói dịch vụ trước đó
- Liên kết 1-1 với thanh toán

### 3. Đẩy tin (`BoostTransaction`)
- Tách biệt hoàn toàn với gói dịch vụ
- Bất kỳ bài đăng nào (trả phí hay miễn phí) đều có thể sử dụng
- Theo dõi thời gian và trạng thái đẩy tin

### 4. Thanh toán (`Payment`)
- Hỗ trợ hai loại thanh toán: gói dịch vụ và đẩy tin
- Lưu thông tin đầy đủ về giao dịch

## Chạy task tự động

Hệ thống cũng đã được cấu hình để tự động kiểm tra và cập nhật:
- Gói dịch vụ hết hạn (mỗi ngày lúc 00:01)
- Đẩy tin hết hạn (mỗi giờ)

## Vấn đề có thể gặp phải

1. Lỗi type khi làm việc với Prisma Client
   - Giải pháp: Chạy `npx prisma generate` để cập nhật Prisma Client

2. Lỗi khi cố gắng truy cập trường mới trong các model cũ
   - Giải pháp: Cập nhật code để sử dụng cấu trúc mới

3. Incompatible migration history
   - Giải pháp: Xóa thư mục `prisma/migrations` và tạo lại migration từ đầu

4. Lỗi schema không khớp với database
   - Giải pháp: Sử dụng `npx prisma migrate reset` (lưu ý sẽ xóa tất cả dữ liệu) 