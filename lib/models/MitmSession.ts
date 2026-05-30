import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * MitmSession Interface
 * Tracks MITM attack sessions for audit and analysis
 */
export interface IMitmSession extends Document {
  session_id: string;
  target_device_id?: mongoose.Types.ObjectId;
  target_ip: string;
  gateway_ip: string;
  start_time: Date;
  end_time?: Date;
  status: 'active' | 'completed' | 'failed';
  total_bandwidth: number;
  packets_captured: number;
  duration_seconds?: number;
  initiated_by: string;
  error_message?: string;
}

/**
 * MitmSession Schema
 * Validates: Requirements 6.7, 6.8, 9.6, 24.6, 24.7, 24.8
 */
const MitmSessionSchema = new Schema<IMitmSession>({
  session_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  target_device_id: {
    type: Schema.Types.ObjectId,
    ref: 'Device',
    required: false,
    index: true
  },
  target_ip: {
    type: String,
    required: true,
    validate: {
      validator: function(v: string) {
        // Validate IPv4 format
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipv4Regex.test(v)) {
          return false;
        }
        // Validate each octet is between 0 and 255
        const octets = v.split('.');
        return octets.every(octet => {
          const num = parseInt(octet, 10);
          return num >= 0 && num <= 255;
        });
      },
      message: 'Invalid IPv4 address format for target_ip'
    }
  },
  gateway_ip: {
    type: String,
    required: true,
    validate: {
      validator: function(v: string) {
        // Validate IPv4 format
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipv4Regex.test(v)) {
          return false;
        }
        // Validate each octet is between 0 and 255
        const octets = v.split('.');
        return octets.every(octet => {
          const num = parseInt(octet, 10);
          return num >= 0 && num <= 255;
        });
      },
      message: 'Invalid IPv4 address format for gateway_ip'
    }
  },
  start_time: {
    type: Date,
    default: Date.now,
    index: true
  },
  end_time: {
    type: Date,
    validate: {
      validator: function(this: IMitmSession, v: Date) {
        // Validate end_time is after start_time if present
        if (v && this.start_time) {
          return v.getTime() > this.start_time.getTime();
        }
        return true;
      },
      message: 'end_time must be after start_time'
    }
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'failed'],
    default: 'active'
  },
  total_bandwidth: {
    type: Number,
    default: 0,
    min: [0, 'total_bandwidth must be non-negative']
  },
  packets_captured: {
    type: Number,
    default: 0,
    min: [0, 'packets_captured must be non-negative']
  },
  duration_seconds: {
    type: Number,
    min: [0, 'duration_seconds must be non-negative']
  },
  initiated_by: {
    type: String,
    required: true
  },
  error_message: {
    type: String
  }
}, {
  timestamps: false,
  collection: 'mitm_sessions'
});

// Create indexes as specified in requirements 24.6, 24.7, 24.8
MitmSessionSchema.index({ session_id: 1 }, { unique: true }); // 24.6 - Unique index on session_id
MitmSessionSchema.index({ target_device_id: 1 }); // 24.7 - Index on target_device_id
MitmSessionSchema.index({ status: 1, start_time: 1 }); // 24.8 - Compound index on (status, start_time)

// Pre-save hook to ensure only one active session per target device
MitmSessionSchema.pre('save', async function(next) {
  if (this.isNew && this.status === 'active') {
    const activeSession = await mongoose.model('MitmSession').findOne({
      target_device_id: this.target_device_id,
      status: 'active'
    });
    
    if (activeSession) {
      throw new Error('An active MITM session already exists for this target device');
    }
  }
  next();
});

// Prevent model recompilation in development
const MitmSession: Model<IMitmSession> = mongoose.models.MitmSession || mongoose.model<IMitmSession>('MitmSession', MitmSessionSchema);

export default MitmSession;
