require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const inputs = await p.prrInputs.findFirst();
    console.log('PRR Inputs sample:', inputs);
  } catch (e) {
    console.error(e);
  } finally {
    await p.$disconnect();
  }
})();
