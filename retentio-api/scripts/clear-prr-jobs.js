require('dotenv').config();
const { Queue } = require('bullmq');

(async () => {
  const q = new Queue('prr-calculation', { connection: { url: process.env.REDIS_URL || 'redis://localhost:6379' } });
  try {
    const statuses = ['waiting','active','completed','failed','delayed','paused'];
    let totalRemoved = 0;
    for (const s of statuses) {
      const jobs = await q.getJobs([s], 0, 1000);
      if (!jobs || jobs.length === 0) continue;
      for (const j of jobs) {
        try {
          await j.remove();
          totalRemoved++;
        } catch (err) {
          console.error('Failed removing job', j.id, err.message || err);
        }
      }
      console.log(`Removed ${jobs.length} jobs with status ${s}`);
    }
    console.log('Total removed:', totalRemoved);
  } catch (e) {
    console.error(e);
    process.exit(2);
  } finally {
    await q.close();
  }
})();
