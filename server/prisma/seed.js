import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const adminPassword = await bcrypt.hash('Admin@123456', 12);
  await prisma.user.upsert({
    where: { email: 'admin@tabunganku.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@tabunganku.com',
      password: adminPassword,
      phone: '081200000001',
      role: 'SUPER_ADMIN',
      isActive: true,
      referralCode: 'ADMIN001',
      emailVerifiedAt: new Date(),
    },
  });
  console.log('✅ Admin created');

  await Promise.all([
    prisma.bankAccount.create({
      data: {
        bankName: 'Bank Syariah Indonesia (BSI)',
        accountNumber: '7182930001',
        accountHolder: 'PT Tabunganku Umroh',
        isActive: true,
      },
    }),
    prisma.bankAccount.create({
      data: {
        bankName: 'Bank Muamalat',
        accountNumber: '3012887650',
        accountHolder: 'PT Tabunganku Umroh',
        isActive: true,
      },
    }),
  ]);
  console.log('✅ Bank accounts created');

  await Promise.all([
    prisma.umrohPackage.create({
      data: {
        name: 'Paket Umroh Hemat 2025',
        slug: 'umroh-hemat-2025',
        description: 'Paket hemat fasilitas standar.',
        price: 25000000,
        departureDate: new Date('2025-12-15'),
        departureCity: 'Jakarta',
        durationDays: 9,
        hotelMakkah: 'Elaf Ajyad (Bintang 3)',
        hotelMadinah: 'Dallah Taibah (Bintang 3)',
        airline: 'Saudi Airlines',
        quota: 45,
        quotaRemaining: 45,
        status: 'OPEN',
      },
    }),
    prisma.umrohPackage.create({
      data: {
        name: 'Paket Umroh Reguler 2026',
        slug: 'umroh-reguler-2026',
        description: 'Paket reguler hotel bintang 4.',
        price: 35000000,
        departureDate: new Date('2026-03-20'),
        departureCity: 'Jakarta',
        durationDays: 12,
        hotelMakkah: 'Pullman Zamzam (Bintang 4)',
        hotelMadinah: 'Millennium Al Aqeeq (Bintang 4)',
        airline: 'Garuda Indonesia',
        quota: 40,
        quotaRemaining: 40,
        status: 'OPEN',
      },
    }),
    prisma.umrohPackage.create({
      data: {
        name: 'Paket Umroh VIP 2026',
        slug: 'umroh-vip-2026',
        description: 'Paket premium bintang 5.',
        price: 55000000,
        departureDate: new Date('2026-06-10'),
        departureCity: 'Jakarta',
        durationDays: 14,
        hotelMakkah: 'Raffles Makkah Palace (Bintang 5)',
        hotelMadinah: 'The Oberoi Madinah (Bintang 5)',
        airline: 'Garuda Indonesia (Business)',
        quota: 20,
        quotaRemaining: 20,
        status: 'OPEN',
      },
    }),
  ]);
  console.log('✅ Packages created');

  console.log('\n🎉 Seeding completed!');
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });