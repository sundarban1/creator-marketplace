const BASE = 'http://localhost:3000';
const email = `suspend-test-${Date.now()}@example.com`;
const password = 'TestPass123';

// 1. Register a creator
let res = await fetch(`${BASE}/api/auth/register`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, role: 'CREATOR', fullName: 'Suspend Test' }),
});
console.log('register:', res.status, await res.json());

// 2. Verify via OTP stub isn't easy without reading DB — instead directly mark verified+suspended via prisma
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const user = await prisma.user.update({
  where: { email },
  data: { isEmailVerified: true, isActive: false, suspendedAt: new Date() },
});
console.log('DB user after suspend:', { id: user.id, isActive: user.isActive, suspendedAt: user.suspendedAt });

// 3. Attempt login — should be blocked with 403 + suspended message
res = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const loginBody = await res.json();
console.log('login attempt while suspended:', res.status, loginBody);

// 4. Reactivate (admin un-suspend) and confirm login now works
await prisma.user.update({ where: { email }, data: { isActive: true, suspendedAt: null } });
res = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
console.log('login attempt after reactivation:', res.status, (await res.json()).success);

// cleanup
await prisma.user.delete({ where: { email } });
await prisma.$disconnect();
