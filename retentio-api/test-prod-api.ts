import jwt from 'jsonwebtoken';
import axios from 'axios';

const JWT_SECRET = '66e59cac872ea879ee1dcb91b215ed9c5feb53504dccf427415488eda01c125d';

// We just need a token with Role.ADMIN payload
const token = jwt.sign(
  {
    id: 'admin_id_placeholder',
    email: 'owner@discovery.com',
    role: 'ADMIN',
    tenantId: 'retentio' // dummy
  },
  JWT_SECRET,
  { expiresIn: '15m' }
);

async function testProd() {
  try {
    console.log('Fetching from production API...');
    const res = await axios.get('http://localhost:3001/api/admin/tenants', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log(`Success! Found ${res.data.length} tenants in production.`);
    console.log('Sample of first tenant:', JSON.stringify(res.data[0], null, 2));
  } catch (err: any) {
    console.error('Error fetching production API:');
    if (err.response) {
      console.error(err.response.status, err.response.data);
    } else {
      console.error(err.message);
    }
  }
}

testProd();
