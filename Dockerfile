# Sử dụng image Node.js chính thức làm base image
FROM node:20

# Thiết lập thư mục làm việc bên trong container
WORKDIR /app-be

# Copy file package.json và pnpm-lock.yaml vào thư mục làm việc
COPY package.json pnpm-lock.yaml ./

# Cài đặt pnpm toàn cục và cài đặt dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy toàn bộ các file ứng dụng còn lại (bao gồm thư mục prisma)
COPY . .

# Sinh Prisma Client
RUN pnpm run prisma:generate

# Build ứng dụng NestJS
RUN pnpm run build

# Expose cổng ứng dụng
EXPOSE 2026

# Chạy Prisma migrate và khởi động ứng dụng
CMD ["sh", "-c", "sleep 10 && pnpm run prisma:db:push && pnpm run db:seed && pnpm run start:prod"]