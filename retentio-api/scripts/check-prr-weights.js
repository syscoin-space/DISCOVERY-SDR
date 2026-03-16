require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const c = await p.prrWeight.count();
    console.log('prrWeight count =', c);
  } catch (e) {
    console.error(e);
  } finally {
    await p.$disconnect();
  }
})();
