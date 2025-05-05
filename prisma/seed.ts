import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create service packages
  const packages = [
    // Free package
    {
      name: 'Basic',
      description: 'A free package for basic users with limited features',
      price: 0,
      duration: 7, // 7 days
      features: JSON.stringify([
        'Post up to 1 lost/found item',
        'Basic search functionality',
        'Standard visibility',
      ]),
      isActive: true,
    },
    // Paid packages
    {
      name: 'Standard',
      description:
        'A standard package with enhanced features for regular users',
      price: 49000, // 49,000 VND
      duration: 30, // 30 days
      features: JSON.stringify([
        'Post up to 5 lost/found items',
        'Enhanced search functionality',
        'Higher visibility in search results',
        'Promotion for 3 days',
      ]),
      isActive: true,
    },
    {
      name: 'Premium',
      description: 'A premium package with advanced features for power users',
      price: 99000, // 99,000 VND
      duration: 60, // 60 days
      features: JSON.stringify([
        'Unlimited lost/found items',
        'Priority search placement',
        'Featured listings',
        'Promotion for 7 days',
        'Direct messaging with finders/owners',
      ]),
      isActive: true,
    },
    {
      name: 'Business',
      description: 'A comprehensive package for businesses and organizations',
      price: 199000, // 199,000 VND
      duration: 90, // 90 days
      features: JSON.stringify([
        'Unlimited lost/found items',
        'Top search placement',
        'Featured listings with badges',
        'Promotion for 14 days',
        'Priority customer support',
        'Custom branding options',
        'Analytics dashboard',
      ]),
      isActive: true,
    },
  ];

  console.log('Seeding service packages...');

  for (const pkg of packages) {
    // Create or update package
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
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
