import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtVerify, SignJWT } from 'jose';
import { randomBytes } from 'node:crypto';
import type { Request } from 'express';
import * as argon2 from 'argon2';
import type { TenantContext } from '@pmcs/database';
import { PrismaService } from '../prisma/prisma.service';
import { loadEnvironment } from '../config/env';
import type { RequestTenantContext } from '../common/http/express';
import type { LoginDto } from './dto/login.dto';

interface MembershipRow {
  organizationId: string;
  membershipId: string;
  userId: string;
}

interface SessionParts {
  sessionId: string;
  organizationId: string;
  secret: string;
}

const textEncoder = new TextEncoder();
const refreshCookieName = 'pmcs_refresh';

@Injectable()
export class AuthService {
  private readonly environment = loadEnvironment();
  private readonly accessKey = textEncoder.encode(this.environment.jwtAccessSecret);

  constructor(private readonly prisma: PrismaService) {}

  async login(input: LoginDto, request: Request) {
    const identity = await this.prisma.userIdentity.findFirst({
      where: {
        provider: 'local',
        loginIdentifier: input.identifier.trim().toLocaleLowerCase(),
      },
      include: {
        user: { select: { id: true, displayName: true, status: true } },
      },
    });
    if (!identity || identity.user.status !== 'active') {
      throw this.invalidCredentials();
    }

    const credential = await this.prisma.passwordCredential.findUnique({
      where: { userId: identity.userId },
      select: { passwordHash: true, mustRotate: true },
    });
    if (!credential || !(await this.passwordMatches(input.password, credential.passwordHash))) {
      throw this.invalidCredentials();
    }

    const membership = await this.selectMembership(identity.userId, input.organizationSlug);
    const context = await this.contextForMembership(membership);
    const refreshToken = await this.createRefreshSession(context, request);

    await this.prisma.user.update({
      where: { id: context.userId },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken: await this.issueAccessToken(context),
      refreshToken,
      expiresIn: this.environment.accessTokenTtlSeconds,
      tokenType: 'Bearer' as const,
      mustRotatePassword: credential.mustRotate,
      user: { id: identity.user.id, displayName: identity.user.displayName },
      organizationId: context.organizationId,
      membershipId: context.membershipId,
      permissions: context.permissions,
    };
  }

  async refresh(cookieHeader: string | undefined, request: Request) {
    const rawToken = readCookie(cookieHeader, refreshCookieName);
    const parts = rawToken ? parseRefreshToken(rawToken) : undefined;
    if (!parts) {
      throw this.invalidCredentials();
    }

    const session = await this.prisma.authSession.findUnique({
      where: { id: parts.sessionId },
      select: { id: true, userId: true, refreshTokenHash: true, expiresAt: true, revokedAt: true },
    });
    if (!session || session.expiresAt <= new Date() || !(await this.passwordMatches(parts.secret, session.refreshTokenHash))) {
      throw this.invalidCredentials();
    }
    if (session.revokedAt) {
      await this.prisma.authSession.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw this.invalidCredentials();
    }

    const memberships = await this.resolveMemberships(session.userId, undefined, parts.organizationId);
    if (memberships.length !== 1) {
      throw new ConflictException({
        code: 'ORGANIZATION_SELECTION_REQUIRED',
        message: 'Select an organization by signing in again',
      });
    }
    const context = await this.contextForMembership(memberships[0]!);
    const nextRefreshToken = await this.rotateRefreshSession(session.id, context, request);

    return {
      accessToken: await this.issueAccessToken(context),
      refreshToken: nextRefreshToken,
      expiresIn: this.environment.accessTokenTtlSeconds,
      tokenType: 'Bearer' as const,
      organizationId: context.organizationId,
      membershipId: context.membershipId,
      permissions: context.permissions,
    };
  }

  async logout(cookieHeader: string | undefined): Promise<void> {
    const rawToken = readCookie(cookieHeader, refreshCookieName);
    const parts = rawToken ? parseRefreshToken(rawToken) : undefined;
    if (!parts) {
      return;
    }
    const session = await this.prisma.authSession.findUnique({
      where: { id: parts.sessionId },
      select: { id: true, refreshTokenHash: true, revokedAt: true },
    });
    if (session && !session.revokedAt && (await this.passwordMatches(parts.secret, session.refreshTokenHash))) {
      await this.prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    }
  }

  async authenticateRequest(request: Request): Promise<RequestTenantContext> {
    const authorization = request.header('authorization');
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) {
      throw this.invalidCredentials();
    }

    try {
      const { payload } = await jwtVerify(token, this.accessKey, {
        issuer: this.environment.jwtIssuer,
        audience: this.environment.jwtAudience,
      });
      const userId = payload.sub;
      const organizationId = payload.organizationId;
      const membershipId = payload.membershipId;
      if (typeof userId !== 'string' || typeof organizationId !== 'string' || typeof membershipId !== 'string') {
        throw this.invalidCredentials();
      }

      const membership = await this.resolveMemberships(userId, undefined, organizationId);
      if (membership.length !== 1 || membership[0]!.membershipId !== membershipId) {
        throw this.invalidCredentials();
      }
      return this.contextForMembership(membership[0]!);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw this.invalidCredentials();
    }
  }

  async assertPermission(context: TenantContext, permission: string): Promise<void> {
    const permissions = await this.permissionsFor(context);
    if (!permissions.includes(permission)) {
      throw new UnauthorizedException({ code: 'FORBIDDEN', message: 'Permission is required' });
    }
  }

  refreshCookie(token: string) {
    return {
      name: refreshCookieName,
      value: token,
      options: {
        httpOnly: true,
        secure: this.environment.cookieSecure,
        sameSite: 'lax' as const,
        path: '/api/v1/auth',
        maxAge: this.environment.refreshTokenTtlSeconds * 1000,
      },
    };
  }

  clearRefreshCookie() {
    return {
      name: refreshCookieName,
      options: {
        httpOnly: true,
        secure: this.environment.cookieSecure,
        sameSite: 'lax' as const,
        path: '/api/v1/auth',
      },
    };
  }

  private async issueAccessToken(context: RequestTenantContext): Promise<string> {
    return new SignJWT({ organizationId: context.organizationId, membershipId: context.membershipId })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(context.userId)
      .setIssuer(this.environment.jwtIssuer)
      .setAudience(this.environment.jwtAudience)
      .setIssuedAt()
      .setExpirationTime(`${this.environment.accessTokenTtlSeconds}s`)
      .sign(this.accessKey);
  }

  private async selectMembership(userId: string, organizationSlug?: string): Promise<MembershipRow> {
    const memberships = await this.resolveMemberships(userId, organizationSlug);
    if (memberships.length === 0) {
      throw this.invalidCredentials();
    }
    if (memberships.length > 1) {
      throw new ConflictException({
        code: 'ORGANIZATION_SELECTION_REQUIRED',
        message: 'Select an organization to continue',
      });
    }
    return memberships[0]!;
  }

  private async resolveMemberships(
    userId: string,
    organizationSlug?: string,
    organizationId?: string,
  ): Promise<MembershipRow[]> {
    return this.prisma.$queryRaw<MembershipRow[]>`
      SELECT
        organization_id AS "organizationId",
        membership_id AS "membershipId",
        user_id AS "userId"
      FROM pmcs.resolve_active_membership(
        ${userId}::uuid,
        ${organizationSlug ?? null}::text,
        ${organizationId ?? null}::uuid
      )
    `;
  }

  private async contextForMembership(membership: MembershipRow): Promise<RequestTenantContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: membership.userId },
      select: { status: true },
    });
    if (!user || user.status !== 'active') {
      throw this.invalidCredentials();
    }
    const tenant: TenantContext = {
      organizationId: membership.organizationId,
      membershipId: membership.membershipId,
    };
    return {
      organizationId: tenant.organizationId,
      membershipId: membership.membershipId,
      userId: membership.userId,
      permissions: await this.permissionsFor(tenant),
    };
  }

  private async permissionsFor(tenant: TenantContext): Promise<readonly string[]> {
    if (!tenant.membershipId) {
      throw this.invalidCredentials();
    }
    const roles = await this.prisma.withTenant(tenant, (tx) =>
      tx.membershipRole.findMany({
        where: { organizationId: tenant.organizationId, membershipId: tenant.membershipId },
        select: { role: { select: { rolePermissions: { select: { permission: { select: { code: true } } } } } } },
      }),
    );
    return [...new Set(roles.flatMap((assignment) => assignment.role.rolePermissions.map(({ permission }) => permission.code)))];
  }

  private async createRefreshSession(context: RequestTenantContext, request: Request): Promise<string> {
    const secret = randomBytes(48).toString('base64url');
    const session = await this.prisma.authSession.create({
      data: {
        userId: context.userId,
        refreshTokenHash: await argon2.hash(secret, { type: argon2.argon2id }),
        expiresAt: new Date(Date.now() + this.environment.refreshTokenTtlSeconds * 1000),
        ipAddress: request.ip,
        userAgent: request.header('user-agent'),
      },
      select: { id: true },
    });
    return `${session.id}.${context.organizationId}.${secret}`;
  }

  private async rotateRefreshSession(sessionId: string, context: RequestTenantContext, request: Request): Promise<string> {
    const token = await this.createRefreshSession(context, request);
    const nextSessionId = parseRefreshToken(token)!.sessionId;
    await this.prisma.authSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date(), replacedById: nextSessionId, lastSeenAt: new Date() },
    });
    return token;
  }

  private async passwordMatches(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Invalid or expired credentials' });
  }
}

function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) {
    return undefined;
  }
  for (const part of header.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) {
      return decodeURIComponent(value.join('='));
    }
  }
  return undefined;
}

function parseRefreshToken(token: string): SessionParts | undefined {
  const [sessionId, organizationId, secret, extra] = token.split('.');
  if (!sessionId || !organizationId || !secret || extra) {
    return undefined;
  }
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(sessionId) || !uuidPattern.test(organizationId) || secret.length < 32) {
    return undefined;
  }
  return { sessionId, organizationId, secret };
}
