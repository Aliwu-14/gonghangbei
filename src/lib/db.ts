// ============================================================
// 本地数据库：用户账号系统
// 后续接入 MySQL 时替换此文件即可
// ============================================================

export interface UserAccount {
  phone: string;
  password: string;
  customerId: string;
  realName: string;
  status: 'ACTIVE' | 'LOCKED' | 'INACTIVE';
  lastLogin: string | null;
}

// ── 用户账号表 ──────────────────────────────────────────────
export const userAccounts: UserAccount[] = [
  { phone: '13800001001', password: '123456', customerId: 'DEMO-C0001', realName: '陈思远', status: 'ACTIVE', lastLogin: null },
  { phone: '13900002002', password: '123456', customerId: 'DEMO-C0002', realName: '王美琳', status: 'ACTIVE', lastLogin: null },
  { phone: '15000003003', password: '123456', customerId: 'DEMO-C0003', realName: '张志豪', status: 'ACTIVE', lastLogin: null },
  { phone: '15100004004', password: '123456', customerId: 'DEMO-C0004', realName: '李雪梅', status: 'ACTIVE', lastLogin: null },
  { phone: '18600005005', password: '123456', customerId: 'DEMO-C0005', realName: '刘建国', status: 'ACTIVE', lastLogin: null },
  { phone: '18700006006', password: '123456', customerId: 'DEMO-C0006', realName: '赵晓燕', status: 'ACTIVE', lastLogin: null },
  { phone: '13500007007', password: '123456', customerId: 'DEMO-C0007', realName: '孙大鹏', status: 'ACTIVE', lastLogin: null },
  { phone: '13600008008', password: '123456', customerId: 'DEMO-C0008', realName: '周慧芳', status: 'ACTIVE', lastLogin: null },
];

// ── 登录验证 ──────────────────────────────────────────────
export function authenticateUser(phone: string, password: string): { success: boolean; user?: UserAccount; error?: string } {
  const user = userAccounts.find(u => u.phone === phone);
  if (!user) return { success: false, error: '该手机号未注册' };
  if (user.status === 'LOCKED') return { success: false, error: '账户已锁定，请携带身份证到柜台解锁' };
  if (user.status === 'INACTIVE') return { success: false, error: '账户已注销' };
  if (user.password !== password) return { success: false, error: '密码错误，请重试' };
  // 更新最后登录时间
  user.lastLogin = new Date().toISOString();
  return { success: true, user };
}

// ── 根据 customerId 获取用户 ──────────────────────────────
export function getUserByCustomerId(customerId: string): UserAccount | undefined {
  return userAccounts.find(u => u.customerId === customerId);
}
