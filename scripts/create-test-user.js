const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Test1234!', 10);
  try {
    const u = await prisma.user.create({
      data: {
        email: 'testuser@cardvela.com',
        username: 'testuser',
        password: hash,
        role: 'user'
      }
    });
    console.log('Created:', u.id, u.email);
  } catch (e) {
    if (e.code === 'P2002') {
      const u = await prisma.user.findUnique({ where: { email: 'testuser@cardvela.com' } });
      console.log('Already exists:', u.id, u.email);
    } else {
      console.error(e);
    }
  }
  await prisma.$disconnect();
}

main();
