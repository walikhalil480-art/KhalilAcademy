const { PrismaClient } = require('@prisma/client');

const passwords = [
  'postgres',
  'root',
  'password',
  '123456',
  'admin',
  'postgres123',
  'postgrespassword2026',
  'Postgres123!',
  'Postgres',
  '1234',
  '12345678',
  'Khalil123!',
  'khalil',
  'Master123!',
  ''
];

(async () => {
  for (const pw of passwords) {
    const url = `postgresql://postgres:${encodeURIComponent(pw)}@localhost:5432/postgres?schema=public`;
    const client = new PrismaClient({ datasources: { db: { url } } });
    try {
      await client.$connect();
      console.log('SUCCESS_PASSWORD:' + pw);
      await client.$disconnect();
      process.exit(0);
    } catch (e) {
      console.log(`Failed with password '${pw}': ${e.message.split('\n')[0]}`);
    }
  }
  console.log('NONE_MATCHED');
  process.exit(1);
})();
