require('dotenv').config();
const { Queue } = require('bullmq');
const q = new Queue('prr-calculation', { connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' } });

(async () => {
  try {
    const id = process.argv[2];
    if (!id) return console.error('Provide job id');
    const job = await q.getJob(id);
    if (!job) return console.log('Job not found');
    console.log({ id: job.id, data: job.data, returnvalue: job.returnvalue, finishedOn: job.finishedOn });
  } catch (e) {
    console.error(e);
  } finally {
    await q.close();
  }
})();
