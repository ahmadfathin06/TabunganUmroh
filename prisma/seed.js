// prisma/seed.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create Super Admin
  const adminPassword = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@umroh.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@umroh.com',
      password: adminPassword,
      phone: '081200000001',
      role: 'SUPER_ADMIN',
      isActive: true,
      referralCode: 'ADMIN001',
      emailVerifiedAt: new Date(),
    },
  });
  console.log('✅ Admin created:', admin.email);

  // 2. Create Bank Accounts
  const banks = await Promise.all([
    prisma.bankAccount.create({
      data: {
        bankName: 'Bank Syariah Indonesia (BSI)',
        accountNumber: '7182930001',
        accountHolder: 'PT Umroh Berkah Mandiri',
        isActive: true,
      },
    }),
    prisma.bankAccount.create({
      data: {
        bankName: 'Bank Muamalat',
        accountNumber: '3012887650',
        accountHolder: 'PT Umroh Berkah Mandiri',
        isActive: true,
      },
    }),
  ]);
  console.log(`✅ ${banks.length} Bank accounts created`);

  // 3. Create Umroh Packages
  const packages = await Promise.all([
    prisma.umrohPackage.create({
      data: {
        name: 'Paket Umroh Hemat 2025',
        slug: 'umroh-hemat-2025',
        description: 'Paket umroh hemat dengan fasilitas standar namun tetap nyaman.',
        price: 25000000,
        departureDate: new Date('2025-12-15'),
        departureCity: 'Jakarta',
        durationDays: 9,
        hotelMakkah: 'Hotel Elaf Ajyad (Bintang 3)',
        hotelMadinah: 'Hotel Dallah Taibah (Bintang 3)',
        airline: 'Saudi Airlines',
        quota: 45,
        quotaRemaining: 45,
        status: 'OPEN',
        includes: JSON.stringify([
          'Tiket pesawat PP',
          'Visa Umroh',
          'Hotel Makkah & Madinah',
          'Makan 3x sehari (catering)',
          'Transportasi bus AC',
          'Muthawwif berpengalaman',
          'Air zamzam 5 liter',
        ]),
        excludes: JSON.stringify([
          'Paspor',
          'Koper & perlengkapan pribadi',
          'Handling bandara',
          'Tips guide',
          'Laundry',
        ]),
      },
    }),
    prisma.umrohPackage.create({
      data: {
        name: 'Paket Umroh Reguler 2026',
        slug: 'umroh-reguler-2026',
        description: 'Paket umroh reguler dengan fasilitas lengkap dan hotel bintang 4.',
        price: 35000000,
        departureDate: new Date('2026-03-20'),
        departureCity: 'Jakarta',
        durationDays: 12,
        hotelMakkah: 'Pullman Zamzam Makkah (Bintang 4)',
        hotelMadinah: 'Millennium Al Aqeeq (Bintang 4)',
        airline: 'Garuda Indonesia',
        quota: 40,
        quotaRemaining: 40,
        status: 'OPEN',
        includes: JSON.stringify([
          'Tiket pesawat PP (Garuda)',
          'Visa Umroh',
          'Hotel Bintang 4 Makkah & Madinah',
          'Makan 3x sehari (buffet hotel)',
          'Transportasi bus VIP',
          'City tour Jeddah',
          'Muthawwif berpengalaman',
          'Air zamzam 10 liter',
          'Handling bandara',
        ]),
        excludes: JSON.stringify([
          'Paspor',
          'Koper & perlengkapan pribadi',
          'Tips guide',
          'Laundry',
        ]),
      },
    }),
    prisma.umrohPackage.create({
      data: {
        name: 'Paket Umroh VIP 2026',
        slug: 'umroh-vip-2026',
        description: 'Paket umroh premium dengan hotel bintang 5 dekat Masjidil Haram.',
        price: 55000000,
        departureDate: new Date('2026-06-10'),
        departureCity: 'Jakarta',
        durationDays: 14,
        hotelMakkah: 'Raffles Makkah Palace (Bintang 5)',
        hotelMadinah: 'The Oberoi Madinah (Bintang 5)',
        airline: 'Garuda Indonesia (Business Class)',
        quota: 20,
        quotaRemaining: 20,
        status: 'OPEN',
        includes: JSON.stringify([
          'Tiket Business Class PP (Garuda)',
          'Visa Umroh',
          'Hotel Bintang 5 (view Masjidil Haram)',
          'Makan 3x sehari (premium)',
          'Transportasi VIP',
          'City tour Jeddah & Thaif',
          'Muthawwif pribadi',
          'Air zamzam 20 liter',
          'Handling VIP bandara',
          'Travel kit premium',
          'Asuransi perjalanan',
        ]),
        excludes: JSON.stringify([
          'Paspor',
          'Perlengkapan pribadi',
        ]),
      },
    }),
  ]);
  console.log(`✅ ${packages.length} Umroh packages created`);

  // 4. Create default settings
  const settings = await Promise.all([
    prisma.setting.upsert({
      where: { key: 'company_name' },
      update: {},
      create: { key: 'company_name', value: 'PT Umroh Berkah Mandiri' },
    }),
    prisma.setting.upsert({
      where: { key: 'company_phone' },
      update: {},
      create: { key: 'company_phone', value: '021-12345678' },
    }),
    prisma.setting.upsert({
      where: { key: 'company_email' },
      update: {},
      create: { key: 'company_email', value: 'info@umrohberkah.com' },
    }),
    prisma.setting.upsert({
      where: { key: 'company_address' },
      update: {},
      create: { key: 'company_address', value: 'Jl. Raya Kebayoran No.10, Jakarta Selatan' },
    }),
    prisma.setting.upsert({
      where: { key: 'referral_bonus_amount' },
      update: {},
      create: { key: 'referral_bonus_amount', value: '50000' },
    }),
    prisma.setting.upsert({
      where: { key: 'reminder_day' },
      update: {},
      create: { key: 'reminder_day', value: '25' },
    }),
  ]);
  console.log(`✅ ${settings.length} Settings created`);

  console.log('\n🎉 Seeding completed!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });