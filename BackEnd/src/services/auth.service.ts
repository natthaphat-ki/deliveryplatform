import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { ApiError } from '../utils/apiError';
import { env } from '../config/env';
import { userService, SafeUser } from './user.service';
import { Role } from '../types/roles';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: 'customer' | 'delivery';
  vehicleType?: string;
  vehicleNumber?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthSession {
  token: string;
  user: SafeUser;
}

const SELF_REGISTERABLE_ROLES: Role[] = ['customer', 'delivery'];
const PASSWORD_SALT_ROUNDS = 10;

function assertRegisterInput(input: Partial<RegisterInput>): asserts input is RegisterInput {
  if (!input.name || !input.email || !input.password || !input.phone || !input.role) {
    throw new ApiError(400, 'กรุณากรอกข้อมูลให้ครบถ้วน');
  }
  if (!SELF_REGISTERABLE_ROLES.includes(input.role as Role)) {
    throw new ApiError(400, `บทบาทต้องเป็นหนึ่งใน: ${SELF_REGISTERABLE_ROLES.join(', ')}`);
  }
  if (input.password.length < 8) {
    throw new ApiError(400, 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
  }
  if (input.role === 'delivery' && (!input.vehicleType?.trim() || !input.vehicleNumber?.trim())) {
    throw new ApiError(400, 'กรุณาระบุประเภทรถและทะเบียนรถ');
  }
}

function issueToken(user: SafeUser): string {
  return jwt.sign({ userId: user.id, role: user.role }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn as SignOptions['expiresIn'],
  });
}


export const authService = {
  async register(input: Partial<RegisterInput>): Promise<SafeUser> {
    assertRegisterInput(input);

    const existing = await userService.findByEmailWithPassword(input.email);
    if (existing) {
      throw new ApiError(409, 'อีเมลนี้ถูกใช้งานแล้ว');
    }

    const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);

    return userService.create({
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: input.role,
      passwordHash,
      deliveryProfile:
        input.role === 'delivery'
          ? { vehicleType: input.vehicleType!.trim(), vehicleNumber: input.vehicleNumber!.trim() }
          : undefined,
    });
  },

  async login(input: Partial<LoginInput>): Promise<AuthSession> {
    if (!input.email || !input.password) {
      throw new ApiError(400, 'กรุณากรอกอีเมลและรหัสผ่าน');
    }

    const user = await userService.findByEmailWithPassword(input.email);
    if (!user) {
      throw new ApiError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    if (user.status !== 'active') {
      throw new ApiError(403, 'บัญชีผู้ใช้ไม่สามารถใช้งานได้');
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new ApiError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    const { passwordHash: _passwordHash, ...safeUser } = user;
    return { token: issueToken(safeUser), user: safeUser };
  },
};
