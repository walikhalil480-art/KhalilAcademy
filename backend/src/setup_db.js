const { PrismaClient } = require('@prisma/client');

const url = 'postgresql://postgres:postgres@localhost:5432/postgres?schema=public';
const prisma = new PrismaClient({ datasources: { db: { url } } });

async function initDb() {
  try {
    console.log('Connecting to postgres default database...');
    await prisma.$connect();
    
    // Set password explicitly
    console.log('Setting postgres user password...');
    await prisma.$executeRawUnsafe(`ALTER USER postgres WITH PASSWORD 'postgrespassword2026';`);
    console.log('Password set to postgrespassword2026 successfully.');

    // Check if khalil_academy_db exists
    const dbs = await prisma.$queryRawUnsafe(`SELECT datname FROM pg_database WHERE datname IN ('khalil_academy_db', 'khalil_academy');`);
    console.log('Existing databases:', dbs);

    let dbExists = dbs.some(d => d.datname === 'khalil_academy_db');
    if (!dbExists) {
      console.log('Creating database khalil_academy_db...');
      await prisma.$executeRawUnsafe(`CREATE DATABASE khalil_academy_db;`);
      console.log('Database khalil_academy_db created successfully.');
    } else {
      console.log('Database khalil_academy_db already exists.');
    }
  } catch (err) {
    console.error('Database setup error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

initDb();
