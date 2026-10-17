import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
  role: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
}

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string,
  avatarUrl?: string
): Promise<UserProfile> {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      if ((displayName && existing[0].displayName !== displayName) || (avatarUrl && existing[0].avatarUrl !== avatarUrl)) {
        const updated = await db
          .update(users)
          .set({
            displayName: displayName || existing[0].displayName,
            avatarUrl: avatarUrl || existing[0].avatarUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.uid, uid))
          .returning();
        return updated[0] as UserProfile;
      }
      return existing[0] as UserProfile;
    }

    // Default to admin for the system owner email axmedka49@gmail.com
    const role = email === 'axmedka49@gmail.com' || email.includes('admin') ? 'admin' : 'customer';

    const inserted = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || email.split('@')[0],
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email)}`,
        role,
        isActive: true,
      })
      .returning();

    return inserted[0] as UserProfile;
  } catch (error) {
    console.error('getOrCreateUser failed:', error);
    throw new Error('Failed to retrieve or create user', { cause: error });
  }
}

export async function getUserByUid(uid: string): Promise<UserProfile | null> {
  try {
    const result = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return (result[0] as UserProfile) || null;
  } catch (error) {
    console.error('getUserByUid error:', error);
    return null;
  }
}

export async function getUserById(id: number): Promise<UserProfile | null> {
  try {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return (result[0] as UserProfile) || null;
  } catch (error) {
    console.error('getUserById error:', error);
    return null;
  }
}

export async function getAllUsers() {
  try {
    return await db.select().from(users).orderBy(users.id);
  } catch (error) {
    console.error('getAllUsers error:', error);
    throw new Error('Failed to fetch users', { cause: error });
  }
}

export async function updateUserRole(id: number, role: string) {
  try {
    const updated = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('updateUserRole error:', error);
    throw new Error('Failed to update user role', { cause: error });
  }
}

export async function toggleUserActive(id: number, isActive: boolean) {
  try {
    const updated = await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated[0];
  } catch (error) {
    console.error('toggleUserActive error:', error);
    throw new Error('Failed to toggle user status', { cause: error });
  }
}
