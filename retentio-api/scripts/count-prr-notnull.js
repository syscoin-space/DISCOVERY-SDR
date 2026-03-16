require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const c = await p.lead.count({ where: { prr_score: { not: null } } });
    console.log('prr_score not null count =', c);
  } catch (e) {
    console.error(e);
  } finally {
    await p.$disconnect();
  }
})();
