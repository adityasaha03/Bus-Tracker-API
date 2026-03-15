import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../src/config/env';

// Generate a mock JWT for a SuperAdmin user
const payload = {
  id: 'wbx_user_superadmin123',
  role: 'SUPER_ADMIN',
  email: 'admin@tracker.com' // Optional, based on your payload design
};

// Sign the token using your environment's secret
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

console.log('\n--- SUPER ADMIN JWT TOKEN ---');
console.log('Copy the string below and use it as your Bearer Token in Hopscotch/Postman:\n');
console.log(token);
console.log('\n-----------------------------\n');
