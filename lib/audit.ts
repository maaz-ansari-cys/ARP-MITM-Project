import connectDB from './mongodb';
import { Schema, model, models, Model } from 'mongoose';

/**
 * Audit Log Interface
 */
export interface IAuditLog {
  action: string;
  username: string;
  target_ip?: string;
  session_id?: string;
  duration_seconds?: number;
  details?: string;
  ip_address: string;
  timestamp: Date;
}

/**
 * Audit Log Schema
 * Validates: Requirements 31.1 - 31.5
 */
const AuditLogSchema = new Schema<IAuditLog>({
  action: { type: String, required: true, index: true },
  username: { type: String, required: true, index: true },
  target_ip: { type: String },
  session_id: { type: String },
  duration_seconds: { type: Number },
  details: { type: String },
  ip_address: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, index: true }
});

const AuditLog: Model<IAuditLog> = models.AuditLog || model<IAuditLog>('AuditLog', AuditLogSchema);

/**
 * Log a security-relevant action to the audit logs
 * 
 * @param logData - Data to log
 */
export async function logAction(logData: Omit<IAuditLog, 'timestamp'>) {
  try {
    await connectDB();
    const log = new AuditLog(logData);
    await log.save();
  } catch (error) {
    console.error('Failed to save audit log:', error);
  }
}

/**
 * Actions constants
 */
export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  REGISTER_ADMIN: 'REGISTER_ADMIN',
  MITM_START: 'MITM_START',
  MITM_STOP: 'MITM_STOP',
  RATE_LIMIT: 'RATE_LIMIT',
};
