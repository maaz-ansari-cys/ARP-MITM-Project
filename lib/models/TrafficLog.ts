import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * TrafficLog Interface
 * Records traffic data captured during MITM sessions
 */
export interface ITrafficLog extends Document {
  device_id: mongoose.Types.ObjectId;
  session_id: string;
  timestamp: Date;
  bytes_sent: number;
  bytes_received: number;
  packets_count: number;
  protocols: Map<string, number>;
  top_destinations?: Array<{ ip: string; count: number }>;
  duration_seconds?: number;
}

/**
 * TrafficLog Schema
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 24.4, 24.5
 */
const TrafficLogSchema = new Schema<ITrafficLog>({
  device_id: {
    type: Schema.Types.ObjectId,
    ref: 'Device',
    required: true,
    index: true,
    validate: {
      validator: async function(v: mongoose.Types.ObjectId) {
        // Validate that device_id references a valid device
        const Device = mongoose.model('Device');
        const device = await Device.findById(v);
        return device !== null;
      },
      message: 'device_id must reference a valid device'
    }
  },
  session_id: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
    validate: {
      validator: function(v: Date) {
        // Validate timestamp is not in the future
        return v.getTime() <= Date.now();
      },
      message: 'timestamp cannot be in the future'
    }
  },
  bytes_sent: {
    type: Number,
    required: true,
    min: [0, 'bytes_sent must be non-negative']
  },
  bytes_received: {
    type: Number,
    required: true,
    min: [0, 'bytes_received must be non-negative']
  },
  packets_count: {
    type: Number,
    required: true,
    min: [0, 'packets_count must be non-negative']
  },
  protocols: {
    type: Map,
    of: Number,
    validate: {
      validator: function(v: Map<string, number>) {
        // Validate protocol names are valid identifiers
        const validProtocols = ['TCP', 'UDP', 'HTTP', 'HTTPS', 'DNS', 'ICMP', 'ARP', 'SSH', 'FTP', 'SMTP', 'TLS', 'OTHER'];
        for (const protocol of v.keys()) {
          if (!validProtocols.includes(protocol.toUpperCase())) {
            return false;
          }
        }
        return true;
      },
      message: 'protocols must contain valid protocol identifiers'
    }
  },
  top_destinations: [{
    ip: { type: String },
    count: { type: Number }
  }],
  duration_seconds: {
    type: Number,
    min: [0, 'duration_seconds must be non-negative']
  }
}, {
  timestamps: false,
  collection: 'traffic_logs'
});

// Create compound indexes as specified in requirements 24.4, 24.5
TrafficLogSchema.index({ device_id: 1, timestamp: 1 }); // 24.4 - Compound index on (device_id, timestamp)
TrafficLogSchema.index({ session_id: 1 }); // 24.5 - Index on session_id

// Prevent model recompilation in development
const TrafficLog: Model<ITrafficLog> = mongoose.models.TrafficLog || mongoose.model<ITrafficLog>('TrafficLog', TrafficLogSchema);

export default TrafficLog;
