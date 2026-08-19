import { prisma } from '../config/database';
import { logger } from '../config/logger';

export interface CreateAuditLogParams {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

export const recordAuditLog = async (params: CreateAuditLogParams) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        details: params.details ? JSON.stringify(params.details) : null,
      },
    });
  } catch (error) {
    logger.error('Failed to record audit log:', error);
  }
};
