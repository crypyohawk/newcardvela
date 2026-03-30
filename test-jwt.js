// 测试JWT生成和验证
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'F5780F1E-E059-4D6E-B8E3-3C6033C17B1f';

console.log('🔐 JWT_SECRET:', JWT_SECRET ? '已设置' : '未设置');

try {
  // 生成测试token
  const testPayload = { userId: 'test-user-id', test: true };
  const token = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '7d' });
  console.log('✅ Token生成成功:', token.substring(0, 20) + '...');

  // 验证token
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('✅ Token验证成功:', decoded);

} catch (error) {
  console.error('❌ JWT错误:', error.message);
}

// 测试密码哈希
const bcrypt = require('bcryptjs');

async function testPassword() {
  const password = 'admin123';
  console.log('🔐 测试密码哈希...');

  try {
    const hash = await bcrypt.hash(password, 12);
    console.log('✅ 密码哈希成功');

    const isValid = await bcrypt.compare(password, hash);
    console.log('✅ 密码验证成功:', isValid);

    const isInvalid = await bcrypt.compare('wrongpassword', hash);
    console.log('✅ 错误密码验证:', isInvalid);

  } catch (error) {
    console.error('❌ 密码哈希错误:', error.message);
  }
}

testPassword();