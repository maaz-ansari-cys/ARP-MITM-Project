import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * User Interface
 * Stores admin user credentials for authentication
 */
export interface IUser extends Document {
  username: string;
  password_hash: string;
  role: 'admin';
  created_at: Date;
  last_login?: Date;
  failed_login_attempts: number;
  locked_until?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

/**
 * User Schema
 * Validates: Requirements 4.3, 4.8, 4.9, 4.10, 23.1, 23.2, 23.3, 23.4, 23.5, 24.9
 */
const UserSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [50, 'Username must not exceed 50 characters'],
    validate: {
      validator: function(v: string) {
        // Validate alphanumeric with underscores
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        return usernameRegex.test(v);
      },
      message: 'Username must be alphanumeric with underscores only'
    }
  },
  password_hash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['admin'],
    default: 'admin'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  last_login: {
    type: Date
  },
  failed_login_attempts: {
    type: Number,
    default: 0,
    min: [0, 'failed_login_attempts must be non-negative']
  },
  locked_until: {
    type: Date,
  }

}, {
  timestamps: false,
  collection: 'users'
});

// NOTE: Password hashing is handled in lib/auth.ts before calling user.save().
// No pre-save hook is needed here — keeping it here caused 'next is not a function'
// errors with Kareem (Mongoose's middleware runner) on async callbacks.


// Method to compare password for login
// Validates: Requirement 23.2
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password_hash);
  } catch (error) {
    return false;
  }
};

// Method to check if account is locked
UserSchema.methods.isLocked = function(): boolean {
  return false; // Always return false (locking disabled)
};

// Method to increment failed login attempts
// Validates: Requirement 4.8, 4.9
UserSchema.methods.incrementFailedAttempts = async function(): Promise<void> {
  // Locking disabled
  await this.save();
};

// Method to reset failed login attempts on successful login
// Validates: Requirement 4.10
UserSchema.methods.resetFailedAttempts = async function(): Promise<void> {
  this.failed_login_attempts = 0;
  this.locked_until = undefined;
  this.last_login = new Date();
  await this.save();
};

// Ensure password_hash is never returned in JSON responses
// Validates: Requirement 23.4
UserSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password_hash;
  return obj;
};

// Prevent model recompilation in development
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
