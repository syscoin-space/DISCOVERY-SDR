require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const id = process.argv[2] || 'e7599d1c-5347-4867-82ca-61b0a9ded2de';
    const l = await p.lead.findUnique({ where: { id }, select: { id: true, prr_score: true, prr_tier: true } });
    console.log(l);
  } catch (e) {
    console.error(e);
  } finally {
    await p.$disconnect();
  }
})();
