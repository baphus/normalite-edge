import prisma from '../src/config/db';

async function main() {
  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: 'flow-owner-',
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: 'flow-student-',
      },
    },
  });

  console.log('cleanup ok');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
