type AuthRole = 'ADMIN' | 'SALES' | 'MECHANIC';

const ROLE_BY_USER_ID: Record<string, AuthRole> = {
  'admin-user': 'ADMIN',
  'sales-user': 'SALES',
  'mechanic-user': 'MECHANIC',
};

export function authUserIdForRole(role: AuthRole): string {
  return `${role.toLowerCase()}-user`;
}

export function authJwtPayloadForRole(role: AuthRole) {
  return {
    sub: authUserIdForRole(role),
    role,
    authVersion: 0,
  };
}

export function findActiveAuthUserById(userId: string) {
  const role = ROLE_BY_USER_ID[userId];

  if (!role) {
    return null;
  }

  return {
    id: userId,
    email: `${role.toLowerCase()}@mecanismos.test`,
    name: `${role} User`,
    role,
    isActive: true,
    authVersion: 0,
    mustChangePassword: false,
  };
}
