import "dotenv/config";

import { config } from "dotenv";
import { randomUUID } from "crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";

import { APP_CONFIG } from "../src/constants/app";
import { securePasswordSchema } from "../src/lib/auth/password-policy";
import { PERMISSIONS } from "../src/constants/permissions/permissions";
import { ROLES } from "../src/constants/permissions/roles";

config({ path: ".env.local" });

type SeedSummary = {
  permissions: number;
  roles: number;
  superAdminUid: string;
  superAdminEmployeeId: string;
  settingsCreated: boolean;
  stalePermissionsDeleted: number;
  staleSystemRolesDeleted: number;
  userPermissionCachesRebuilt: number;
};

function getRequiredEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function formatPrivateKey(privateKey: string): string {
  return privateKey.replace(/\\n/g, "\n");
}

function initFirebaseAdmin() {
  if (getApps().length > 0) {
    return;
  }

  initializeApp({
    credential: cert({
      projectId: getRequiredEnv("FIREBASE_PROJECT_ID"),
      clientEmail: getRequiredEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: formatPrivateKey(getRequiredEnv("FIREBASE_PRIVATE_KEY")),
    }),
  });
}

function getSlugId(slug: string): string {
  return slug.replace(/\./g, "_");
}

function getEmployeeCode(): string {
  return "EMP-0001";
}

async function seedPermissions() {
  const db = getFirestore();
  const batch = db.batch();

  for (const permission of PERMISSIONS) {
    const permissionId = getSlugId(permission.slug);
    const ref = db.collection("permissions").doc(permissionId);

    batch.set(
      ref,
      {
        id: permissionId,
        name: permission.name,
        slug: permission.slug,
        module: permission.module,
        description: permission.description,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  await batch.commit();

  return PERMISSIONS.length;
}

async function seedRoles() {
  const db = getFirestore();
  const batch = db.batch();

  for (const role of ROLES) {
    const roleId = role.slug;
    const permissionIds = role.permissionSlugs.map(getSlugId);

    const ref = db.collection("roles").doc(roleId);

    batch.set(
      ref,
      {
        id: roleId,
        name: role.name,
        slug: role.slug,
        description: role.description,
        isSystem: role.isSystem,
        permissionIds,
        permissionSlugs: role.permissionSlugs,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  await batch.commit();

  return ROLES.length;
}

async function cleanupStalePermissions(): Promise<number> {
  const db = getFirestore();
  const activePermissionIds = new Set(
    PERMISSIONS.map((permission) => getSlugId(permission.slug)),
  );
  const existingPermissions = await db.collection("permissions").get();
  const staleDocs = existingPermissions.docs.filter(
    (document) => !activePermissionIds.has(document.id),
  );

  for (let index = 0; index < staleDocs.length; index += 400) {
    const batch = db.batch();
    for (const document of staleDocs.slice(index, index + 400)) {
      batch.delete(document.ref);
    }
    await batch.commit();
  }

  return staleDocs.length;
}

async function cleanupStaleSystemRoles(): Promise<number> {
  const db = getFirestore();
  const activeRoleSlugs = new Set<string>(ROLES.map((role) => role.slug));
  const existingRoles = await db.collection("roles").get();
  const staleDocs = existingRoles.docs.filter((document) => {
    const data = document.data();
    return data.isSystem === true && !activeRoleSlugs.has(document.id);
  });

  for (let index = 0; index < staleDocs.length; index += 400) {
    const batch = db.batch();
    for (const document of staleDocs.slice(index, index + 400)) {
      batch.delete(document.ref);
    }
    await batch.commit();
  }

  return staleDocs.length;
}

async function rebuildAllUserPermissionCaches(): Promise<number> {
  const db = getFirestore();
  const [usersSnap, rolesSnap] = await Promise.all([
    db.collection("users").get(),
    db.collection("roles").get(),
  ]);
  const activePermissions = new Set<string>(
    PERMISSIONS.map((permission) => permission.slug),
  );
  const rolePermissionMap = new Map<string, string[]>();

  for (const roleDoc of rolesSnap.docs) {
    const role = roleDoc.data();
    const permissionSlugs = Array.isArray(role.permissionSlugs)
      ? role.permissionSlugs.filter(
          (permission): permission is string =>
            typeof permission === "string" && activePermissions.has(permission),
        )
      : [];
    rolePermissionMap.set(roleDoc.id, permissionSlugs);
  }

  for (let index = 0; index < usersSnap.docs.length; index += 400) {
    const batch = db.batch();

    for (const userDoc of usersSnap.docs.slice(index, index + 400)) {
      const user = userDoc.data();
      const roleSlugs = Array.isArray(user.roleSlugs)
        ? user.roleSlugs.filter((role): role is string => typeof role === "string")
        : [];
      const permissions = new Set<string>();

      for (const roleSlug of roleSlugs) {
        for (const permission of rolePermissionMap.get(roleSlug) ?? []) {
          permissions.add(permission);
        }
      }

      batch.update(userDoc.ref, {
        permissionsCache: Array.from(permissions).sort(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
  }

  return usersSnap.size;
}

async function createOrGetSuperAdminAuthUser() {
  const auth = getAuth();

  const name = getRequiredEnv("SUPER_ADMIN_NAME");
  const email = getRequiredEnv("SUPER_ADMIN_EMAIL");
  const password = securePasswordSchema.parse(
    getRequiredEnv("SUPER_ADMIN_PASSWORD"),
  );

  try {
    const existingUser = await auth.getUserByEmail(email);

    await auth.updateUser(existingUser.uid, {
      displayName: name,
      disabled: false,
    });

    await auth.setCustomUserClaims(existingUser.uid, {
      roleSlugs: ["super_admin"],
    });

    return existingUser;
  } catch (error) {
    const firebaseError = error as { code?: string };

    if (firebaseError.code !== "auth/user-not-found") {
      throw error;
    }

    const createdUser = await auth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: true,
      disabled: false,
    });

    await auth.setCustomUserClaims(createdUser.uid, {
      roleSlugs: ["super_admin"],
    });

    return createdUser;
  }
}

async function createOrUpdateSuperAdminProfile(uid: string) {
  const db = getFirestore();

  const name = getRequiredEnv("SUPER_ADMIN_NAME");
  const email = getRequiredEnv("SUPER_ADMIN_EMAIL");

  const superAdminRole = ROLES.find((role) => role.slug === "super_admin");

  if (!superAdminRole) {
    throw new Error("Super admin role definition is missing.");
  }

  const employeeQuery = await db
    .collection("employees")
    .where("userId", "==", uid)
    .limit(1)
    .get();

  let employeeId = employeeQuery.docs[0]?.id;

  if (!employeeId) {
    employeeId = db.collection("employees").doc().id;
  }

  const userRef = db.collection("users").doc(uid);
  const employeeRef = db.collection("employees").doc(employeeId);

  const now = FieldValue.serverTimestamp();

  await db.runTransaction(async (transaction) => {
    transaction.set(
      userRef,
      {
        uid,
        name,
        email,
        avatar: null,
        status: "ACTIVE",
        mustChangePassword: true,
        employeeId,
        roleIds: ["super_admin"],
        roleSlugs: ["super_admin"],
        permissionsCache: superAdminRole.permissionSlugs,
        lastLoginAt: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
      { merge: true },
    );

    transaction.set(
      employeeRef,
      {
        id: employeeId,
        userId: uid,
        employeeCode: getEmployeeCode(),
        fullName: name,
        email,
        phone: null,
        address: null,
        photo: null,
        position: "Founder / Super Admin",
        department: "MANAGEMENT",
        employmentType: "FULL_TIME",
        joinDate: Timestamp.now(),
        resignDate: null,
        status: "ACTIVE",
        emergencyContactName: null,
        emergencyContactPhone: null,
        notes: "Initial super admin employee profile generated by seed script.",
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
      { merge: true },
    );
  });

  return employeeId;
}

async function seedSystemSettings() {
  const db = getFirestore();
  const settingRef = db.collection("settings").doc("system");
  const settingSnap = await settingRef.get();

  await settingRef.set(
    {
      appName: APP_CONFIG.name,
      companyName: APP_CONFIG.companyName,
      domain: APP_CONFIG.domain,
      timezone: APP_CONFIG.timezone,
      currency: APP_CONFIG.currency,
      createdAt: settingSnap.exists
        ? (settingSnap.data()?.createdAt ?? FieldValue.serverTimestamp())
        : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return !settingSnap.exists;
}

async function seedAuditLog(summary: SeedSummary) {
  const db = getFirestore();
  const auditLogId = randomUUID();

  await db
    .collection("auditLogs")
    .doc(auditLogId)
    .set({
      id: auditLogId,
      userId: summary.superAdminUid,
      userName: getRequiredEnv("SUPER_ADMIN_NAME"),
      action: "SYSTEM_SEED_COMPLETED",
      module: "system",
      entityId: null,
      entityType: "seed",
      oldValue: null,
      newValue: {
        permissions: summary.permissions,
        roles: summary.roles,
        superAdminUid: summary.superAdminUid,
        superAdminEmployeeId: summary.superAdminEmployeeId,
        settingsCreated: summary.settingsCreated,
        stalePermissionsDeleted: summary.stalePermissionsDeleted,
        staleSystemRolesDeleted: summary.staleSystemRolesDeleted,
        userPermissionCachesRebuilt: summary.userPermissionCachesRebuilt,
      },
      ipAddress: null,
      userAgent: "scripts/seed.ts",
      createdAt: FieldValue.serverTimestamp(),
    });
}

async function main() {
  console.log("🚀 Starting Nexty Labs ERP Firebase seed...");

  initFirebaseAdmin();

  console.log("1/9 Seeding permissions...");
  const permissionCount = await seedPermissions();

  console.log("2/9 Removing stale permissions...");
  const stalePermissionsDeleted = await cleanupStalePermissions();

  console.log("3/9 Seeding roles...");
  const roleCount = await seedRoles();

  console.log("4/9 Removing stale system roles...");
  const staleSystemRolesDeleted = await cleanupStaleSystemRoles();

  console.log("5/9 Creating or updating super admin Firebase Auth user...");
  const superAdminAuthUser = await createOrGetSuperAdminAuthUser();

  console.log("6/9 Creating or updating super admin Firestore profile...");
  const employeeId = await createOrUpdateSuperAdminProfile(
    superAdminAuthUser.uid,
  );

  console.log("7/9 Rebuilding user permission caches...");
  const userPermissionCachesRebuilt = await rebuildAllUserPermissionCaches();

  console.log("8/9 Creating or updating settings/system...");
  const settingsCreated = await seedSystemSettings();

  const summary: SeedSummary = {
    permissions: permissionCount,
    roles: roleCount,
    superAdminUid: superAdminAuthUser.uid,
    superAdminEmployeeId: employeeId,
    settingsCreated,
    stalePermissionsDeleted,
    staleSystemRolesDeleted,
    userPermissionCachesRebuilt,
  };

  console.log("9/9 Writing seed audit log...");
  await seedAuditLog(summary);

  console.log("");
  console.log("✅ Nexty Labs ERP Firebase seed completed.");
  console.table(summary);
}

main().catch((error) => {
  console.error("");
  console.error("❌ Nexty Labs ERP Firebase seed failed.");
  console.error(error);
  process.exit(1);
});
