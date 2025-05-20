FROM node:20

WORKDIR /app-be

# Cài đặt dependencies build
RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# Copy package.json và cài đặt dependencies
COPY package.json ./
RUN npm install

# Copy toàn bộ source code
COPY . .

# Generate Prisma Client và build ứng dụng
RUN npx prisma generate
RUN npm run build

# Kiểm tra cấu trúc thư mục sau build
RUN ls -la dist/

# Port cho ứng dụng
EXPOSE 2026

# Chạy ứng dụng
CMD ["sh", "-c", "npx prisma db push && node dist/main.js"]