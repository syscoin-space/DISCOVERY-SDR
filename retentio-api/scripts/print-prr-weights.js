require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const ws = await p.prrWeight.findMany({ orderBy: { dimension: 'asc' } });
    console.log('PRR Weights:');
    for (const w of ws) console.log(w.dimension, JSON.stringify(w));
  } catch (e) {
    console.error(e);
  } finally {
    await p.$disconnect();
  }
})();
