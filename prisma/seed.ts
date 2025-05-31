import { PackageType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const packages = [
    {
      name: 'Tiêu Chuẩn',
      description: 'Gói đăng tin tiêu chuẩn miễn phí cho người dùng',
      price: 0,
      duration: 7,
      packageType: PackageType.FREE,
      position: 0,
      features: JSON.stringify([
        'Đăng 1 tin mất/nhặt được',
        'Tính năng tìm kiếm cơ bản',
        'Hiển thị tiêu chuẩn trên website',
      ]),
    },
    {
      name: 'Nổi Bật',
      description: 'Gói đăng tin nổi bật với khả năng tiếp cận cao hơn',
      price: 30000,
      duration: 3,
      packageType: PackageType.PRIORITY,
      position: 1,
      features: JSON.stringify([
        'Ghim bài trên website trong 3 ngày',
        'Nhãn dán "Nổi Bật" trên tin đăng',
        'Thông báo email và notification định kỳ',
        'Sử dụng AI quét tự động kiểm tra thông tin trùng lặp',
        'Tư vấn và chỉnh sửa tin đăng miễn phí',
      ]),
    },
    {
      name: 'Ưu Tiên',
      description: 'Gói đăng tin ưu tiên cho việc tìm kiếm hiệu quả',
      price: 50000,
      duration: 5,
      packageType: PackageType.EXPRESS,
      position: 2,
      features: JSON.stringify([
        'Ghim bài trên website trong 5 ngày',
        'Nhãn dán "Ưu Tiên" trên tin đăng',
        'Thông báo ngay khi AI phát hiện thông tin trùng lặp',
        'Tự động đẩy bài lên fanpage và các hội nhóm tìm đồ',
        'Gia hạn ghim tin thêm 2 ngày nếu chưa có thông tin',
        'Tư vấn và chỉnh sửa tin đăng miễn phí để tối ưu',
      ]),
    },
    {
      name: 'Tìm Gấp',
      description: 'Gói đăng tin tìm kiếm khẩn cấp với độ ưu tiên cao nhất',
      price: 100000,
      duration: 10,
      packageType: PackageType.VIP,
      position: 3,
      features: JSON.stringify([
        'Ghim bài trên website trong 10 ngày',
        'Nhãn dán "Tìm Gấp" nổi bật trên tin đăng',
        'CTV hỗ trợ rà soát và tìm kiếm ở các nền tảng xã hội',
        'Liên lạc ngay khi có thông tin chính xác',
        'Tự động đẩy bài lên fanpage và các hội nhóm tìm đồ',
        'Thông báo ngay khi AI phát hiện thông tin trùng lặp',
        'Gia hạn ghim tin thêm 5 ngày theo yêu cầu',
        'Tư vấn và chỉnh sửa tin đăng để tối ưu hiệu quả',
        'Đăng thông báo lên Facebook, TikTok, Zalo (tương lai)',
      ]),
    },
  ];

  console.log('Seeding service packages...');

  for (const pkg of packages) {
    await prisma.servicePackage.upsert({
      where: { name: pkg.name },
      update: pkg,
      create: pkg,
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
