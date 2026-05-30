import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Device Interface
 * Represents a network device discovered via ARP scanning
 */
export interface IDevice extends Document {
  ip_address: string;
  mac_address: string;
  vendor: string;
  hostname?: string;
  first_seen: Date;
  last_seen: Date;
  status: 'active' | 'inactive';
  is_gateway: boolean;
  device_type?: string;
  open_ports?: number[];
  network_subnet?: string;
}

/**
 * Device Schema
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 24.1, 24.2, 24.3
 */
const DeviceSchema = new Schema<IDevice>({
  ip_address: {
    type: String,
    required: true,
    unique: true,
    index: true,
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
      message: 'Invalid IPv4 address format'
    }
  },
  mac_address: {
    type: String,
    required: true,
    index: true,
    validate: {
      validator: function(v: string) {
        // Validate MAC address format
        const macRegex = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
        return macRegex.test(v);
      },
      message: 'Invalid MAC address format'
    }
  },
  vendor: {
    type: String,
    default: 'Unknown'
  },
  hostname: {
    type: String
  },
  first_seen: {
    type: Date,
    default: Date.now
  },
  last_seen: {
    type: Date,
    default: Date.now,
    index: true,
    validate: {
      validator: function(v: Date) {
        // Validate last_seen is not in the future
        return v.getTime() <= Date.now();
      },
      message: 'last_seen timestamp cannot be in the future'
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    index: true
  },
  is_gateway: {
    type: Boolean,
    default: false
  },
  device_type: {
    type: String
  },
  open_ports: [{
    type: Number
  }],
  network_subnet: {
    type: String,
    index: true
  }
}, {
  timestamps: false,
  collection: 'devices'
});

// Create indexes as specified in requirements 24.1, 24.2, 24.3
DeviceSchema.index({ ip_address: 1 }, { unique: true }); // 24.1 - Unique index on ip_address
DeviceSchema.index({ last_seen: 1 }); // 24.2 - Index on last_seen
DeviceSchema.index({ status: 1 }); // 24.3 - Index on status

// Prevent model recompilation in development
const Device: Model<IDevice> = mongoose.models.Device || mongoose.model<IDevice>('Device', DeviceSchema);

export default Device;
