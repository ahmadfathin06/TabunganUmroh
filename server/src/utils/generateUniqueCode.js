import prisma from '../config/database.js';

const generateUniqueCode = async () => {
  for (let i = 0; i < 10; i++) {
    const code = Math.floor(Math.random() * 900) + 100;
    const used = await prisma.deposit.findFirst({
      where: { uniqueCode: code, status: { in: ['PENDING'] } },
      select: { id: true },
    });
    if (!used) return code;
  }
  return Math.floor(Math.random() * 900) + 100;
};

export default generateUniqueCode;