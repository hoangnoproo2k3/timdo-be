# Sử dụng image Node.js chính thức làm base image
FROM node:20

# Cài đặt các công cụ cần thiết để build bcrypt
RUN apt-get update && apt-get install -y python3 make g++

# Thiết lập thư mục làm việc bên trong container
WORKDIR /app-be

# Copy file package.json và pnpm-lock.yaml vào thư mục làm việc
COPY package.json pnpm-lock.yaml ./

# Cài đặt pnpm toàn cục và cài đặt dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy toàn bộ các file ứng dụng còn lại (bao gồm thư mục prisma)
COPY . .

# Rebuild bcrypt để đảm bảo tương thích với môi trường
RUN pnpm rebuild bcrypt

# Sinh Prisma Client
RUN pnpm run prisma:generate

# Build ứng dụng NestJS
RUN pnpm run build

# Expose cổng ứng dụng
EXPOSE 2025

# Chạy Prisma migrate, seed và khởi động ứng dụng
CMD ["sh", "-c", "sleep 10 && pnpm run prisma:db:push && pnpm run db:seed && pnpm run start:prod"]