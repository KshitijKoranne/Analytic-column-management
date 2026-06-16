import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq, inArray } from "drizzle-orm";
import { getDb, hasDatabase } from "@/lib/db";
import { permissions, rolePermissions, roles, userRoles, users } from "@/db/schema";

const demoEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
const demoPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
const allowDemoLogin = !hasDatabase() && process.env.NODE_ENV !== "production";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? (process.env.NODE_ENV !== "production" ? "local-development-column-management-secret" : undefined),
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login"
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {}
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "").toLowerCase();
        const password = String(credentials?.password ?? "");

        if (!email || !password) return null;

        if (allowDemoLogin) {
          if (email === demoEmail && password === demoPassword) {
            return {
              id: "demo-admin",
              name: "QC Admin",
              email: demoEmail,
              roles: ["admin"],
              permissions: ["*"]
            };
          }
          return null;
        }

        if (!hasDatabase()) return null;

        const db = getDb();
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user?.passwordHash || !user.isActive) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        const assignedRoles = await db.select({ roleId: userRoles.roleId }).from(userRoles).where(eq(userRoles.userId, user.id));
        const roleRows = assignedRoles.length
          ? await db.select({ key: roles.key }).from(roles).where(
              inArray(
                roles.id,
                assignedRoles.map((role) => role.roleId)
              )
            )
          : [];
        const permissionRows = assignedRoles.length
          ? await db
              .select({ key: permissions.key })
              .from(rolePermissions)
              .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
              .where(
                inArray(
                  rolePermissions.roleId,
                  assignedRoles.map((role) => role.roleId)
                )
              )
          : [];

        return {
          id: user.id,
          name: user.name ?? user.email ?? "User",
          email: user.email,
          roles: roleRows.map((role) => role.key),
          permissions: Array.from(new Set(permissionRows.map((permission) => permission.key)))
        };
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.roles = user.roles ?? ["auditor"];
        token.permissions = user.permissions ?? [];
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.roles = Array.isArray(token.roles) ? token.roles.map(String) : ["auditor"];
        session.user.permissions = Array.isArray(token.permissions) ? token.permissions.map(String) : [];
        session.user.role = session.user.roles[0] ?? "auditor";
      }
      return session;
    }
  }
});
