import { PackageType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const packages = [
    {
      name: 'Basic',
      description: 'A free package for basic users with limited features',
      price: 0,
      duration: 7,
      packageType: PackageType.FREE,
      position: 0,
      features: JSON.stringify([
        'Post up to 1 lost/found item',
        'Basic search functionality',
        'Standard visibility',
      ]),
    },
    {
      name: 'Standard',
      description:
        'A standard package with enhanced features for regular users',
      price: 49000,
      duration: 30,
      packageType: PackageType.PRIORITY,
      position: 1,
      features: JSON.stringify([
        'Post up to 5 lost/found items',
        'Enhanced search functionality',
        'Higher visibility in search results',
        'Promotion for 3 days',
      ]),
    },
    {
      name: 'Premium',
      description: 'A premium package with advanced features for power users',
      price: 99000,
      duration: 60,
      packageType: PackageType.EXPRESS,
      position: 2,
      features: JSON.stringify([
        'Unlimited lost/found items',
        'Priority search placement',
        'Featured listings',
        'Promotion for 7 days',
        'Direct messaging with finders/owners',
      ]),
    },
    {
      name: 'Business',
      description: 'A comprehensive package for businesses and organizations',
      price: 199000,
      duration: 90,
      packageType: PackageType.VIP,
      position: 3,
      features: JSON.stringify([
        'Unlimited lost/found items',
        'Top search placement',
        'Featured listings with badges',
        'Promotion for 14 days',
        'Priority customer support',
        'Custom branding options',
        'Analytics dashboard',
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
