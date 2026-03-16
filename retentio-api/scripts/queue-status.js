require('dotenv').config();
const { Queue } = require('bullmq');

(async () => {
  const q = new Queue('prr-calculation', { connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' } });
  try {
    const counts = await q.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
    console.log('Queue counts:', counts);
    const jobs = await q.getJobs(['waiting'], 0, 10);
    console.log('Sample waiting jobs:', jobs.map(j => ({ id: j.id, data: j.data })));
  } catch (e) {
    console.error(e);
  } finally {
    await q.close();
  }
})();
