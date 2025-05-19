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
        'Email thông báo khi có thông tin mới',
        'Tư vấn và chỉnh sửa tin đăng miễn phí',
      ]),
    },
    {
      name: 'Nổi Bật',
      description: 'Gói đăng tin nổi bật với khả năng tiếp cận cao hơn',
      price: 30000,
      duration: 14,
      packageType: PackageType.PRIORITY,
      position: 1,
      features: JSON.stringify([
        'Đăng tối đa 3 tin mất/nhặt được',
        'Ghim bài trên website trong 3 ngày',
        'Nhãn dán "Nổi Bật" trên tin đăng',
        'Thông báo email và notification định kỳ',
        'Sử dụng AI quét tự động kiểm tra thông tin trùng lặp',
        'Tư vấn và chỉnh sửa tin đăng miễn phí',
        'Hoàn tiền 20% nếu tìm được đồ trong ngày đầu tiên',
      ]),
    },
    {
      name: 'Ưu Tiên',
      description: 'Gói đăng tin ưu tiên cho việc tìm kiếm hiệu quả',
      price: 50000,
      duration: 21,
      packageType: PackageType.EXPRESS,
      position: 2,
      features: JSON.stringify([
        'Đăng tối đa 5 tin mất/nhặt được',
        'Ghim bài trên website trong 7 ngày',
        'Nhãn dán "Ưu Tiên" trên tin đăng',
        'Thông báo ngay khi AI phát hiện thông tin trùng lặp',
        'Tự động đẩy bài lên fanpage và các hội nhóm tìm đồ',
        'Gia hạn ghim tin thêm 3 ngày nếu chưa có thông tin',
        'Tư vấn và chỉnh sửa tin đăng miễn phí để tối ưu',
        'Hoàn tiền 20% nếu tìm được đồ trong ngày đầu tiên',
      ]),
    },
    {
      name: 'Tìm Gấp',
      description: 'Gói đăng tin tìm kiếm khẩn cấp với độ ưu tiên cao nhất',
      price: 100000,
      duration: 30,
      packageType: PackageType.VIP,
      position: 3,
      features: JSON.stringify([
        'Không giới hạn số lượng tin đăng',
        'Ghim bài trên website trong 14 ngày',
        'Nhãn dán "Tìm Gấp" nổi bật trên tin đăng',
        'CTV hỗ trợ rà soát và tìm kiếm ở các nền tảng xã hội',
        'Liên lạc ngay khi có thông tin chính xác',
        'Tự động đẩy bài lên fanpage và các hội nhóm tìm đồ',
        'Đăng thông báo lên Facebook, TikTok, Zalo (tương lai)',
        'Thông báo ngay khi AI phát hiện thông tin trùng lặp',
        'Gia hạn ghim tin thêm 3 ngày theo yêu cầu',
        'Tư vấn và chỉnh sửa tin đăng để tối ưu hiệu quả',
        'Hoàn tiền 20% nếu tìm được đồ trong ngày đầu tiên',
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
