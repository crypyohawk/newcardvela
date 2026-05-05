INSERT INTO "User" (id, email, username, password, role, balance, "aiBalance", "createdAt", "updatedAt")
VALUES ('test_user_local_001', 'test@cardvela.local', 'testuser', '$2a$10$do/ZCUbHkIDsJ02aqrHi6.lcAuv5qsEq6veStfyMw5bMDK0mvT3R.', 'user', 100.00, 50.00, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, balance = 100.00, "aiBalance" = 50.00, "updatedAt" = NOW()
RETURNING id, email, username, balance, "aiBalance";
