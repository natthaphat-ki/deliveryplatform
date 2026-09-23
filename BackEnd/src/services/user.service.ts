import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db';
import { ApiError } from '../utils/apiError';
import { Role } from '../types/roles';

export interface SafeUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: Role;
  status: 'active' | 'inactive';
  createdAt: Date;
}

export interface UserWithPassword extends SafeUser {
  passwordHash: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  phone: string;
  role: Role;
  /** Created in the same transaction as the user (delivery role only). */
  deliveryProfile?: { vehicleType: string; vehicleNumber: string };
}

interface UserRow extends RowDataPacket {
  user_id: number;
  name: string;
  email: string;
  password_hash: string;
  phone: string;
  status: 'active' | 'inactive';
  created_at: Date;
  role_name: Role;
}

const SELECT_USER_SQL = `
  SELECT u.user_id, u.name, u.email, u.password_hash, u.phone, u.status, u.created_at, r.role_name
  FROM users u
  JOIN roles r ON r.role_id = u.role_id
`;

function toSafeUser(row: UserRow): SafeUser {
  return {
    id: row.user_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role_name,
    status: row.status,
    createdAt: row.created_at,
  };
}

export const userService = {
  async findByEmailWithPassword(email: string): Promise<UserWithPassword | null> {
    const [rows] = await pool.query<UserRow[]>(`${SELECT_USER_SQL} WHERE u.email = ?`, [email]);
    const row = rows[0];
    if (!row) {
      return null;
    }
    return { ...toSafeUser(row), passwordHash: row.password_hash };
  },

  async findById(id: number): Promise<SafeUser> {
    const [rows] = await pool.query<UserRow[]>(`${SELECT_USER_SQL} WHERE u.user_id = ?`, [id]);
    const row = rows[0];
    if (!row) {
      throw new ApiError(404, 'User not found');
    }
    return toSafeUser(row);
  },

  async list(): Promise<SafeUser[]> {
    const [rows] = await pool.query<UserRow[]>(`${SELECT_USER_SQL} ORDER BY u.created_at DESC`);
    return rows.map(toSafeUser);
  },

  async create(input: CreateUserInput): Promise<SafeUser> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO users (role_id, name, email, password_hash, phone)
         SELECT role_id, ?, ?, ?, ? FROM roles WHERE role_name = ?`,
        [input.name, input.email, input.passwordHash, input.phone, input.role]
      );

      if (result.affectedRows === 0) {
        throw new ApiError(400, `Unknown role: ${input.role}`);
      }

      if (input.deliveryProfile) {
        await connection.execute<ResultSetHeader>(
          `INSERT INTO delivery_profiles (user_id, vehicle_type, vehicle_number, availability_status)
           VALUES (?, ?, ?, 'available')`,
          [result.insertId, input.deliveryProfile.vehicleType, input.deliveryProfile.vehicleNumber]
        );
      }

      await connection.commit();
      return userService.findById(result.insertId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
};
