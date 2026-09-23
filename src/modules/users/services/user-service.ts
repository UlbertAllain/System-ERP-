import "server-only";

import type { UserRecord } from "firebase-admin/auth";
import { COLLECTIONS, getDb, serverTimestamp } from "@/lib/firebase/firestore";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { AppError } from "@/lib/errors/app-error";
import { getAuditLogDocument } from "@/lib/audit/audit-log";
import type { CurrentUser, UserStatus } from "@/types/auth";
import type { PaginatedResult } from "@/types/common";
import type { UserDetail, UserListItem } from "@/types/user";
import type { PermissionSlug, RoleSlug } from "@/constants/permissions";

import { normalizeSearchText } from "@/lib/domain/firestore-value";
import {
  findUserById,
  listUsers,
  listUsersPaginated,
} from "@/features/users/repositories/user-repository";
type CreateInternalUserParams = {
  actor: CurrentUser;
  name: string;
  email: string;
  password: string;
  roleSlugs: RoleSlug[];
  mustChangePassword: boolean;
};

type UpdateUserProfileParams = {
  actor: CurrentUser;
  uid: string;
  name: string;
  email: string;
};

type UpdateUserRolesParams = {
  actor: CurrentUser;
  uid: string;
  roleSlugs: RoleSlug[];
};

type UpdateUserStatusParams = {
  actor: CurrentUser;
  uid: string;
};

type ListUsersPaginatedParams = {
  search?: string;
  status?: UserStatus;
  roleSlug?: RoleSlug;
  page: number;
  pageSize: number;
};

type RoleDocument = {
  id: string;
  slug: RoleSlug;
  permissionSlugs: PermissionSlug[];
};

async function getRolesBySlugs(roleSlugs: RoleSlug[]): Promise<RoleDocument[]> {
  const uniqueRoleSlugs = Array.from(new Set(roleSlugs));

  const roleSnaps = await Promise.all(
    uniqueRoleSlugs.map((roleSlug) =>
      getDb().collection(COLLECTIONS.roles).doc(roleSlug).get(),
    ),
  );

  const missingRoles = roleSnaps
    .filter((snap) => !snap.exists)
    .map((snap) => snap.id);

  if (missingRoles.length > 0) {
    throw new AppError(
      `Role tidak ditemukan: ${missingRoles.join(", ")}`,
      400,
      "ROLE_NOT_FOUND",
    );
  }

  return roleSnaps.map((snap) => {
    const data = snap.data() ?? {};

    return {
      id: snap.id,
      slug: data.slug as RoleSlug,
      permissionSlugs: Array.isArray(data.permissionSlugs)
        ? data.permissionSlugs
        : [],
    };
  });
}

function buildPermissionsCache(roles: RoleDocument[]): PermissionSlug[] {
  const permissionSet = new Set<PermissionSlug>();

  for (const role of roles) {
    for (const permissionSlug of role.permissionSlugs) {
      permissionSet.add(permissionSlug);
    }
  }

  return Array.from(permissionSet).sort();
}

async function getUserDocumentOrThrow(uid: string): Promise<UserDetail> {
  const user = await findUserById(uid);

  if (!user) {
    throw new AppError("User tidak ditemukan.", 404, "USER_NOT_FOUND");
  }

  return user;
}

async function findAuthUserByEmail(email: string): Promise<UserRecord | null> {
  try {
    return await getFirebaseAdminAuth().getUserByEmail(email);
  } catch (error) {
    const firebaseError = error as { code?: string };

    if (firebaseError.code === "auth/user-not-found") {
      return null;
    }

    throw error;
  }
}

export async function listUsersService(): Promise<UserListItem[]> {
  return listUsers();
}

export async function listUsersPaginatedService(
  input: ListUsersPaginatedParams,
): Promise<PaginatedResult<UserListItem>> {
  return listUsersPaginated(input);
}

export async function getUserByIdService(uid: string): Promise<UserDetail> {
  const user = await getUserDocumentOrThrow(uid);

  if (user.deletedAt) {
    throw new AppError("User sudah dihapus.", 404, "USER_DELETED");
  }

  return user;
}

export async function createInternalUserService({
  actor,
  name,
  email,
  password,
  roleSlugs,
  mustChangePassword,
}: CreateInternalUserParams): Promise<UserDetail> {
  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const existingAuthUser = await findAuthUserByEmail(normalizedEmail);

  if (existingAuthUser) {
    throw new AppError(
      "Email sudah terdaftar di Firebase Auth.",
      409,
      "AUTH_EMAIL_ALREADY_EXISTS",
    );
  }

  const roles = await getRolesBySlugs(roleSlugs);
  const permissionSlugs = buildPermissionsCache(roles);
  const adminAuth = getFirebaseAdminAuth();
  const db = getDb();
  let createdAuthUser: UserRecord | null = null;
  let profileCommitted = false;

  try {
    createdAuthUser = await adminAuth.createUser({
      email: normalizedEmail,
      password,
      displayName: normalizedName,
      emailVerified: false,
      disabled: false,
    });

    await adminAuth.setCustomUserClaims(createdAuthUser.uid, {
      roleSlugs,
    });

    const userRef = db.collection(COLLECTIONS.users).doc(createdAuthUser.uid);
    const auditLog = getAuditLogDocument({
      user: actor,
      action: "USER_CREATED",
      module: "user",
      entityId: createdAuthUser.uid,
      entityType: "user",
      oldValue: null,
      newValue: {
        uid: createdAuthUser.uid,
        name: normalizedName,
        email: normalizedEmail,
        status: "ACTIVE",
        roleSlugs,
        mustChangePassword,
      },
    });
    const batch = db.batch();

    batch.set(userRef, {
      uid: createdAuthUser.uid,
      name: normalizedName,
      email: normalizedEmail,
      avatar: null,
      status: "ACTIVE",
      mustChangePassword,
      employeeId: null,
      roleIds: roleSlugs,
      roleSlugs,
      permissionsCache: permissionSlugs,
      searchText: normalizeSearchText(
        normalizedName,
        normalizedEmail,
        "ACTIVE",
        ...roleSlugs,
      ),
      lastLoginAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      deletedAt: null,
    });
    batch.set(auditLog.ref, auditLog.data);
    await batch.commit();
    profileCommitted = true;
  } catch (error) {
    if (createdAuthUser && !profileCommitted) {
      await adminAuth.deleteUser(createdAuthUser.uid).catch((rollbackError) => {
        console.error("[user-create-rollback]", rollbackError);
      });
    }

    throw error;
  }

  if (!createdAuthUser) {
    throw new AppError(
      "Pembuatan user tidak menghasilkan akun Auth.",
      500,
      "AUTH_USER_CREATION_FAILED",
    );
  }

  return getUserByIdService(createdAuthUser.uid);
}

export async function updateUserProfileService({
  actor,
  uid,
  name,
  email,
}: UpdateUserProfileParams): Promise<UserDetail> {
  const oldUser = await getUserByIdService(uid);
  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const auth = getFirebaseAdminAuth();
  const oldAuthUser = await auth.getUser(uid);
  const authUserWithEmail = await findAuthUserByEmail(normalizedEmail);

  if (authUserWithEmail && authUserWithEmail.uid !== uid) {
    throw new AppError(
      "Email sudah digunakan user lain.",
      409,
      "EMAIL_ALREADY_USED",
    );
  }

  await auth.updateUser(uid, {
    displayName: normalizedName,
    email: normalizedEmail,
  });

  try {
    const db = getDb();
    const userRef = db.collection(COLLECTIONS.users).doc(uid);
    const auditLog = getAuditLogDocument({
      user: actor,
      action: "USER_PROFILE_UPDATED",
      module: "user",
      entityId: uid,
      entityType: "user",
      oldValue: {
        name: oldUser.name,
        email: oldUser.email,
      },
      newValue: {
        name: normalizedName,
        email: normalizedEmail,
      },
    });
    const batch = db.batch();

    batch.update(userRef, {
      name: normalizedName,
      email: normalizedEmail,
      searchText: normalizeSearchText(
        normalizedName,
        normalizedEmail,
        oldUser.status,
        ...oldUser.roleSlugs,
      ),
      updatedAt: serverTimestamp(),
    });
    batch.set(auditLog.ref, auditLog.data);
    await batch.commit();
  } catch (error) {
    await auth
      .updateUser(uid, {
        displayName: oldAuthUser.displayName,
        email: oldAuthUser.email,
      })
      .catch((rollbackError) => {
        console.error("[user-profile-rollback]", rollbackError);
      });
    throw error;
  }

  return getUserByIdService(uid);
}

export async function suspendUserService({
  actor,
  uid,
}: UpdateUserStatusParams): Promise<UserDetail> {
  if (actor.uid === uid) {
    throw new AppError(
      "User tidak bisa suspend akun sendiri.",
      400,
      "CANNOT_SUSPEND_SELF",
    );
  }

  const oldUser = await getUserByIdService(uid);
  const auth = getFirebaseAdminAuth();
  const oldAuthUser = await auth.getUser(uid);
  await auth.updateUser(uid, { disabled: true });

  try {
    const db = getDb();
    const userRef = db.collection(COLLECTIONS.users).doc(uid);
    const auditLog = getAuditLogDocument({
      user: actor,
      action: "USER_SUSPENDED",
      module: "user",
      entityId: uid,
      entityType: "user",
      oldValue: { status: oldUser.status },
      newValue: { status: "SUSPENDED" },
    });
    const batch = db.batch();

    batch.update(userRef, {
      status: "SUSPENDED",
      searchText: normalizeSearchText(
        oldUser.name,
        oldUser.email,
        "SUSPENDED",
        ...oldUser.roleSlugs,
      ),
      updatedAt: serverTimestamp(),
    });
    batch.set(auditLog.ref, auditLog.data);
    await batch.commit();
  } catch (error) {
    await auth
      .updateUser(uid, { disabled: oldAuthUser.disabled })
      .catch((rollbackError) => {
        console.error("[user-suspend-rollback]", rollbackError);
      });
    throw error;
  }

  await auth.revokeRefreshTokens(uid).catch((revokeError) => {
    console.error("[user-session-revoke]", revokeError);
  });

  return getUserByIdService(uid);
}

export async function activateUserService({
  actor,
  uid,
}: UpdateUserStatusParams): Promise<UserDetail> {
  const oldUser = await getUserDocumentOrThrow(uid);
  const auth = getFirebaseAdminAuth();
  const oldAuthUser = await auth.getUser(uid);
  await auth.updateUser(uid, { disabled: false });

  try {
    const db = getDb();
    const userRef = db.collection(COLLECTIONS.users).doc(uid);
    const auditLog = getAuditLogDocument({
      user: actor,
      action: "USER_ACTIVATED",
      module: "user",
      entityId: uid,
      entityType: "user",
      oldValue: { status: oldUser.status, deletedAt: oldUser.deletedAt },
      newValue: { status: "ACTIVE", deletedAt: null },
    });
    const batch = db.batch();

    batch.update(userRef, {
      status: "ACTIVE",
      deletedAt: null,
      searchText: normalizeSearchText(
        oldUser.name,
        oldUser.email,
        "ACTIVE",
        ...oldUser.roleSlugs,
      ),
      updatedAt: serverTimestamp(),
    });
    batch.set(auditLog.ref, auditLog.data);
    await batch.commit();
  } catch (error) {
    await auth
      .updateUser(uid, { disabled: oldAuthUser.disabled })
      .catch((rollbackError) => {
        console.error("[user-activate-rollback]", rollbackError);
      });
    throw error;
  }

  await auth.revokeRefreshTokens(uid).catch((revokeError) => {
    console.error("[user-session-revoke]", revokeError);
  });

  return getUserByIdService(uid);
}

export async function updateUserRolesService({
  actor,
  uid,
  roleSlugs,
}: UpdateUserRolesParams): Promise<UserDetail> {
  if (actor.uid === uid && !roleSlugs.includes("super_admin")) {
    throw new AppError(
      "Super admin tidak boleh menghapus role super_admin dari akun sendiri.",
      400,
      "CANNOT_REMOVE_OWN_SUPER_ADMIN_ROLE",
    );
  }

  const oldUser = await getUserByIdService(uid);
  const roles = await getRolesBySlugs(roleSlugs);
  const permissionSlugs = buildPermissionsCache(roles);
  const auth = getFirebaseAdminAuth();
  const oldAuthUser = await auth.getUser(uid);
  const oldClaims = oldAuthUser.customClaims ?? {};

  await auth.setCustomUserClaims(uid, {
    ...oldClaims,
    roleSlugs,
  });

  try {
    const db = getDb();
    const userRef = db.collection(COLLECTIONS.users).doc(uid);
    const auditLog = getAuditLogDocument({
      user: actor,
      action: "USER_ROLES_UPDATED",
      module: "user",
      entityId: uid,
      entityType: "user",
      oldValue: {
        roleSlugs: oldUser.roleSlugs,
        permissionsCache: oldUser.permissionsCache,
      },
      newValue: {
        roleSlugs,
        permissionsCache: permissionSlugs,
      },
    });
    const batch = db.batch();

    batch.update(userRef, {
      roleIds: roleSlugs,
      roleSlugs,
      permissionsCache: permissionSlugs,
      searchText: normalizeSearchText(
        oldUser.name,
        oldUser.email,
        oldUser.status,
        ...roleSlugs,
      ),
      updatedAt: serverTimestamp(),
    });
    batch.set(auditLog.ref, auditLog.data);
    await batch.commit();
  } catch (error) {
    await auth.setCustomUserClaims(uid, oldClaims).catch((rollbackError) => {
      console.error("[user-role-rollback]", rollbackError);
    });
    throw error;
  }

  await auth.revokeRefreshTokens(uid).catch((revokeError) => {
    console.error("[user-session-revoke]", revokeError);
  });

  return getUserByIdService(uid);
}

export async function softDeleteUserService({
  actor,
  uid,
}: UpdateUserStatusParams): Promise<UserDetail> {
  if (actor.uid === uid) {
    throw new AppError(
      "User tidak bisa menghapus akun sendiri.",
      400,
      "CANNOT_DELETE_SELF",
    );
  }

  const oldUser = await getUserByIdService(uid);
  const auth = getFirebaseAdminAuth();
  const oldAuthUser = await auth.getUser(uid);
  await auth.updateUser(uid, { disabled: true });

  try {
    const db = getDb();
    const userRef = db.collection(COLLECTIONS.users).doc(uid);
    const auditLog = getAuditLogDocument({
      user: actor,
      action: "USER_DELETED",
      module: "user",
      entityId: uid,
      entityType: "user",
      oldValue: {
        status: oldUser.status,
        deletedAt: oldUser.deletedAt,
      },
      newValue: {
        status: "INACTIVE",
        deletedAt: "SERVER_TIMESTAMP",
      },
    });
    const batch = db.batch();

    batch.update(userRef, {
      status: "INACTIVE",
      searchText: normalizeSearchText(
        oldUser.name,
        oldUser.email,
        "INACTIVE",
        ...oldUser.roleSlugs,
      ),
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(auditLog.ref, auditLog.data);
    await batch.commit();
  } catch (error) {
    await auth
      .updateUser(uid, { disabled: oldAuthUser.disabled })
      .catch((rollbackError) => {
        console.error("[user-delete-rollback]", rollbackError);
      });
    throw error;
  }

  await auth.revokeRefreshTokens(uid).catch((revokeError) => {
    console.error("[user-session-revoke]", revokeError);
  });

  return {
    ...oldUser,
    status: "INACTIVE",
    deletedAt: new Date(),
  };
}

