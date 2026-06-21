import "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      roles?: string[];
      permissions?: string[];
    };
  }

  interface User {
    role?: string;
    roles?: string[];
    permissions?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    roles?: string[];
    permissions?: string[];
    loginAt?: number;
    lastActivityAt?: number;
  }
}
