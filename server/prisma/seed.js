import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function upsertBankAccount(data) {
  const existing = await prisma.bankAccount.findFirst({
    where: { bankName: data.bankName, accountNumber: data.accountNumber },
  });
  if (existing) {
    return prisma.bankAccount.update({ where: { id: existing.id }, data });
  }
  return prisma.bankAccount.create({ data });
}

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

  const userPassword = await bcrypt.hash('Password123', 12);
  const demoUser = await prisma.user.upsert({
    where: { email: 'jamaah@tabunganku.com' },
    update: {},
    create: {
      name: 'Ahmad Fauzi',
      email: 'jamaah@tabunganku.com',
      password: userPassword,
      phone: '081200000002',
      ktpNumber: '3201010101010001',
      address: 'Jl. Melati No. 10, Jakarta Selatan',
      role: 'USER',
      isActive: true,
      referralCode: 'JAMAAH1',
      hasPassport: true,
      passportNumber: 'B1234567',
      emailVerifiedAt: new Date(),
    },
  });
  console.log('✅ Demo user created');

  const bankAccounts = [
    {
      bankName: 'Bank Syariah Indonesia (BSI)',
      accountNumber: '7182930001',
      accountHolder: 'PT Tabunganku Umroh',
      isActive: true,
    },
    {
      bankName: 'Bank Muamalat',
      accountNumber: '3012887650',
      accountHolder: 'PT Tabunganku Umroh',
      isActive: true,
    },
    {
      bankName: 'Bank Mandiri Syariah',
      accountNumber: '7099001122',
      accountHolder: 'PT Tabunganku Umroh',
      isActive: true,
    },
  ];
  for (const bank of bankAccounts) {
    await upsertBankAccount(bank);
  }
  console.log('✅ Bank accounts created');

  const packages = [
    {
      name: 'Paket Umroh Hemat 2027',
      slug: 'umroh-hemat-2027',
      description: 'Paket hemat fasilitas standar, hotel dekat masjid.',
      price: 26900000,
      departureDate: new Date('2027-01-20T20:00:00Z'),
      departureCity: 'Jakarta',
      durationDays: 9,
      hotelMakkah: 'Elaf Ajyad (Bintang 3)',
      hotelMadinah: 'Dallah Taibah (Bintang 3)',
      airline: 'Saudi Airlines',
      category: 'Reguler',
      isFeatured: false,
      features: JSON.stringify([
        'Hotel bintang 3, 500 m dari Masjidil Haram',
        'Visa umroh + tiket pesawat PP',
        'Makan 3x sehari & transport bus AC',
        'Pendamping mutawif berbahasa Indonesia',
        'Manasik sebelum keberangkatan',
      ]),
      quota: 45,
      quotaRemaining: 45,
      includes: 'Visa, tiket, hotel, makan 3x, transport, manasik, pembimbing',
      status: 'OPEN',
    },
    {
      name: 'Paket Umroh Reguler Plus 2027',
      slug: 'umroh-reguler-plus-2027',
      description: 'Paket reguler hotel bintang 4 dekat Masjidil Haram.',
      price: 35000000,
      departureDate: new Date('2027-04-15T20:00:00Z'),
      departureCity: 'Jakarta',
      durationDays: 12,
      hotelMakkah: 'Pullman Zamzam (Bintang 4)',
      hotelMadinah: 'Millennium Al Aqeeq (Bintang 4)',
      airline: 'Garuda Indonesia',
      category: 'Premium',
      isFeatured: true,
      features: JSON.stringify([
        'Hotel bintang 4, 150 m dari Masjidil Haram',
        'Visa umroh + tiket Garuda Indonesia PP',
        'Makan 3x sehari (buffet Indonesia)',
        'Ziarah Makkah & Madinah dengan guide',
        'Manasik + kitab panduan umroh',
        'Atasan seragam jamaah & koper eksklusif',
      ]),
      quota: 40,
      quotaRemaining: 40,
      includes: 'Visa, tiket, hotel bintang 4, makan 3x, ziarah, manasik',
      status: 'OPEN',
    },
    {
      name: 'Paket Umroh VIP 2027',
      slug: 'umroh-vip-2027',
      description: 'Paket premium bintang 5, in-front Haram.',
      price: 58500000,
      departureDate: new Date('2027-08-10T20:00:00Z'),
      departureCity: 'Jakarta',
      durationDays: 14,
      hotelMakkah: 'Raffles Makkah Palace (Bintang 5)',
      hotelMadinah: 'The Oberoi Madinah (Bintang 5)',
      airline: 'Garuda Indonesia (Business)',
      category: 'VIP',
      isFeatured: false,
      features: JSON.stringify([
        'Hotel bintang 5 langsung menghadap Haram',
        'Business class Garuda Indonesia PP',
        'All-inclusive meals + butler service',
        'Transportasi private VIP',
        'Visa cepat & handling bandara prioritas',
        'Pendamping khusus 1:10 jamaah',
      ]),
      quota: 20,
      quotaRemaining: 20,
      includes: 'Visa, tiket business class, hotel bintang 5, all-inclusive, butler service',
      status: 'OPEN',
    },
    {
      name: 'Paket Umroh Plus Turki 2027',
      slug: 'umroh-plus-turki-2027',
      description: 'Umroh dilanjut wisata kota Istanbul.',
      price: 42500000,
      departureDate: new Date('2027-10-05T20:00:00Z'),
      departureCity: 'Surabaya',
      durationDays: 15,
      hotelMakkah: 'Hilton Suites (Bintang 4)',
      hotelMadinah: 'Al Salam (Bintang 4)',
      airline: 'Turkish Airlines',
      category: 'Premium',
      isFeatured: false,
      features: JSON.stringify([
        'Umroh + city tour Istanbul 3 hari',
        'Hotel bintang 4 di Makkah & Madinah',
        'Visa umroh + visa Turki',
        'Guide lokal berbahasa Indonesia',
        'Makan 3x sehari sepanjang perjalanan',
      ]),
      quota: 35,
      quotaRemaining: 35,
      includes: 'Visa, tiket, hotel bintang 4, tour Istanbul, guide lokal',
      status: 'OPEN',
    },
  ];
  for (const pkg of packages) {
    await prisma.umrohPackage.upsert({
      where: { slug: pkg.slug },
      // only refresh the premium-display fields so demo quota/balance data stays intact
      update: {
        category: pkg.category,
        isFeatured: pkg.isFeatured,
        features: pkg.features,
      },
      create: pkg,
    });
  }
  console.log('✅ Packages created');

  // Rencana tabungan demo supaya dashboard user langsung terisi
  const hematPkg = await prisma.umrohPackage.findUnique({ where: { slug: 'umroh-hemat-2027' } });
  const regularPkg = await prisma.umrohPackage.findUnique({ where: { slug: 'umroh-reguler-plus-2027' } });

  await prisma.savingsPlan.upsert({
    where: { id: 'demo-plan-hemat' },
    update: {},
    create: {
      id: 'demo-plan-hemat',
      userId: demoUser.id,
      packageId: hematPkg.id,
      jamaahName: demoUser.name,
      jamaahRelation: 'self',
      targetAmount: hematPkg.price,
      currentBalance: 6500000,
      monthlyTarget: 1500000,
      status: 'ACTIVE',
    },
  });
  await prisma.savingsPlan.upsert({
    where: { id: 'demo-plan-reguler' },
    update: {},
    create: {
      id: 'demo-plan-reguler',
      userId: demoUser.id,
      packageId: regularPkg.id,
      jamaahName: 'Siti Aisyah',
      jamaahRelation: 'istri',
      targetAmount: regularPkg.price,
      currentBalance: 12500000,
      monthlyTarget: 2000000,
      status: 'ACTIVE',
    },
  });
  console.log('✅ Demo savings plans created');

  const bsi = await prisma.bankAccount.findFirst({
    where: { bankName: 'Bank Syariah Indonesia (BSI)', accountNumber: '7182930001' },
  });
  const depositCount = await prisma.deposit.count();
  if (depositCount === 0) {
    await Promise.all([
      prisma.deposit.create({
        data: {
          savingsPlanId: 'demo-plan-hemat',
          amount: 1500000,
          uniqueCode: 123,
          totalTransfer: 1500123,
          proofImage: null,
          paymentMethod: 'TRANSFER',
          status: 'PENDING',
          bankAccountId: bsi.id,
        },
      }),
      prisma.deposit.create({
        data: {
          savingsPlanId: 'demo-plan-hemat',
          amount: 2000000,
          uniqueCode: 456,
          totalTransfer: 2000456,
          proofImage: null,
          paymentMethod: 'TRANSFER',
          status: 'APPROVED',
          bankAccountId: bsi.id,
        },
      }),
      prisma.deposit.create({
        data: {
          savingsPlanId: 'demo-plan-reguler',
          amount: 3000000,
          uniqueCode: 789,
          totalTransfer: 3000789,
          proofImage: null,
          paymentMethod: 'TRANSFER',
          status: 'APPROVED',
          bankAccountId: bsi.id,
        },
      }),
    ]);
    console.log('✅ Demo deposits created');
  } else {
    console.log('⏭️ Deposits already exist, skipped');
  }

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