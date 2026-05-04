export function createActiveAdminUserFixture() {
  return {
    user: {
      id: 'admin-user-1',
      name: 'Admin User',
      email: 'admin@mecanismos.test',
      role: 'ADMIN' as const,
      isActive: true,
    },
    account: {
      id: 'admin-account-1',
      userId: 'admin-user-1',
      passwordHash:
        '$2b$10$fixturehashfixturehashfixturehashfixturehashfixturehashfi',
    },
    session: {
      id: 'admin-session-1',
      familyId: 'admin-family-1',
      tokenDigest: 'fixture-refresh-digest',
    },
  };
}
