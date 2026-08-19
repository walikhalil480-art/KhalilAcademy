import { User } from '../types';

export const normalizeUser = (apiUser: any): User | null => {
  if (!apiUser) return null;

  const displayName =
    apiUser.name ||
    apiUser.fullName ||
    (apiUser.firstName ? `${apiUser.firstName} ${apiUser.lastName || ''}`.trim() : '') ||
    apiUser.email?.split('@')[0] ||
    'User';

  return {
    id: apiUser.id || apiUser.userId || '',
    name: displayName,
    email: apiUser.email || '',
    role: apiUser.role || 'STUDENT',
    status: apiUser.status || 'ACTIVE',
    emailVerified: apiUser.emailVerified ?? true,
    avatar: apiUser.avatar || undefined,
    bio: apiUser.bio || undefined,
    createdAt: apiUser.createdAt || new Date().toISOString(),
    updatedAt: apiUser.updatedAt || new Date().toISOString(),
  };
};

export const getDisplayName = (user?: Partial<User> | null): string => {
  if (!user) return 'User';
  if (user.name && user.name.trim()) return user.name.trim();
  if (user.email && user.email.trim()) return user.email.split('@')[0];
  return 'User';
};

export const getUserInitial = (user?: Partial<User> | null): string => {
  const name = getDisplayName(user);
  return name.charAt(0).toUpperCase();
};
