export interface Env {
  DB: D1Database;
  FOOTBALL_API_KEY?: string;
}

type Role = 'admin' | 'participant';

type UserRow = {
  id: string;
  full_name: string;
  phone_normalized: string;
  role: Role;
  is_active: number;
};

type UserWithPassword = UserRow & {
  password_hash: string;
};

const SESSION_COOKIE = 'prode_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const PASSWORD_ITERATIONS = 100_000;
const encoder = new TextEncoder();

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

function error(message: string, status = 400) {
  return json({ error: message }, { status });
}

function publicUser(user: UserRow) {
  return {
    id: user.id,
    fullName: user.full_name,
    phone: user.phone_normalized,
    role: user.role,
    isActive: Boolean(user.is_active),
  };
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, '');
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string) {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) {
    throw new Error('Invalid hex');
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function randomHex(length: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return bytesToHex(bytes);
}

async function derivePassword(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations,
    },
    key,
    256,
  );

  return bytesToHex(new Uint8Array(bits));
}

async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePassword(password, salt, PASSWORD_ITERATIONS);
  return `pbkdf2_sha256$${PASSWORD_ITERATIONS}$${bytesToHex(salt)}$${hash}`;
}

async function verifyPassword(password: string, stored: string) {
  try {
    const [algorithm, iterationsRaw, saltHex, expectedHash] = stored.split('$');
    if (algorithm !== 'pbkdf2_sha256') return false;

    const iterations = Number.parseInt(iterationsRaw, 10);
    if (!Number.isFinite(iterations) || iterations <= 0) return false;

    const actualHash = await derivePassword(password, hexToBytes(saltHex), iterations);
    if (actualHash.length !== expectedHash.length) return false;

    let difference = 0;
    for (let index = 0; index < actualHash.length; index += 1) {
      difference |= actualHash.charCodeAt(index) ^ expectedHash.charCodeAt(index);
    }
    return difference === 0;
  } catch {
    return false;
  }
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

function readCookie(request: Request, name: string) {
  const header = request.headers.get('cookie');
  if (!header) return null;

  for (const part of header.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (rawName === name) return decodeURIComponent(rawValue.join('='));
  }
  return null;
}

function sessionCookie(request: Request, token: string, maxAge = SESSION_MAX_AGE) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

async function parseBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

async function currentUser(request: Request, env: Env): Promise<UserRow | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;

  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(
    `SELECT u.id, u.full_name, u.phone_normalized, u.role, u.is_active
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?
       AND julianday(s.expires_at) > julianday('now')
       AND u.is_active = 1
     LIMIT 1`,
  )
    .bind(tokenHash)
    .first<UserRow>();

  return row ?? null;
}

async function requireAdmin(request: Request, env: Env) {
  const user = await currentUser(request, env);
  if (!user) return { response: error('No autorizado', 401), user: null };
  if (user.role !== 'admin') return { response: error('Acceso de administrador requerido', 403), user: null };
  return { response: null, user };
}

async function createSession(request: Request, env: Env, userId: string) {
  const token = randomHex(32);
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');

  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at)
     VALUES (?, ?, ?, ?)`,
  )
    .bind(crypto.randomUUID(), userId, tokenHash, expiresAt)
    .run();

  return token;
}

function validateCredentials(fullName: string, phone: string, password: string) {
  if (fullName.trim().length < 3) return 'Ingresá nombre y apellido';
  if (normalizePhone(phone).length < 6) return 'Ingresá un teléfono válido';
  if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
  return null;
}

async function setupStatus(env: Env) {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM users WHERE role = 'admin'`,
  ).first<{ total: number }>();

  return Number(row?.total ?? 0) === 0;
}

async function createFirstAdmin(request: Request, env: Env) {
  if (!(await setupStatus(env))) return error('El administrador inicial ya fue creado', 409);

  const body = await parseBody<{ fullName?: string; phone?: string; password?: string }>(request);
  if (!body) return error('Datos inválidos');

  const fullName = body.fullName?.trim() ?? '';
  const phone = normalizePhone(body.phone ?? '');
  const password = body.password ?? '';
  const validationError = validateCredentials(fullName, phone, password);
  if (validationError) return error(validationError);

  const existing = await env.DB.prepare('SELECT id FROM users WHERE phone_normalized = ? LIMIT 1')
    .bind(phone)
    .first();
  if (existing) return error('Ese teléfono ya está registrado', 409);

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  await env.DB.prepare(
    `INSERT INTO users (id, full_name, phone_normalized, password_hash, role)
     VALUES (?, ?, ?, ?, 'admin')`,
  )
    .bind(id, fullName, phone, passwordHash)
    .run();

  const token = await createSession(request, env, id);
  const response = json({
    user: {
      id,
      fullName,
      phone,
      role: 'admin',
      isActive: true,
    },
  }, { status: 201 });
  response.headers.set('set-cookie', sessionCookie(request, token));
  return response;
}

async function login(request: Request, env: Env) {
  const body = await parseBody<{ phone?: string; password?: string }>(request);
  if (!body) return error('Datos inválidos');

  const phone = normalizePhone(body.phone ?? '');
  const password = body.password ?? '';
  if (!phone || !password) return error('Completá teléfono y contraseña');

  const user = await env.DB.prepare(
    `SELECT id, full_name, phone_normalized, password_hash, role, is_active
     FROM users
     WHERE phone_normalized = ?
     LIMIT 1`,
  )
    .bind(phone)
    .first<UserWithPassword>();

  if (!user || !user.is_active || !(await verifyPassword(password, user.password_hash))) {
    return error('Teléfono o contraseña incorrectos', 401);
  }

  const token = await createSession(request, env, user.id);
  const response = json({ user: publicUser(user) });
  response.headers.set('set-cookie', sessionCookie(request, token));
  return response;
}

async function logout(request: Request, env: Env) {
  const token = readCookie(request, SESSION_COOKIE);
  if (token) {
    const tokenHash = await sha256(token);
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
  }

  const response = json({ ok: true });
  response.headers.set('set-cookie', sessionCookie(request, '', 0));
  return response;
}

async function listUsers(request: Request, env: Env) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const result = await env.DB.prepare(
    `SELECT id, full_name, phone_normalized, role, is_active
     FROM users
     ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END, full_name COLLATE NOCASE`,
  ).all<UserRow>();

  return json({ users: (result.results ?? []).map(publicUser) });
}

async function createParticipant(request: Request, env: Env) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const body = await parseBody<{ fullName?: string; phone?: string; password?: string }>(request);
  if (!body) return error('Datos inválidos');

  const fullName = body.fullName?.trim() ?? '';
  const phone = normalizePhone(body.phone ?? '');
  const password = body.password ?? '';
  const validationError = validateCredentials(fullName, phone, password);
  if (validationError) return error(validationError);

  const existing = await env.DB.prepare('SELECT id FROM users WHERE phone_normalized = ? LIMIT 1')
    .bind(phone)
    .first();
  if (existing) return error('Ese teléfono ya está registrado', 409);

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  await env.DB.prepare(
    `INSERT INTO users (id, full_name, phone_normalized, password_hash, role)
     VALUES (?, ?, ?, ?, 'participant')`,
  )
    .bind(id, fullName, phone, passwordHash)
    .run();

  await env.DB.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, after_json)
     VALUES (?, 'participant.created', 'user', ?, ?)`,
  )
    .bind(auth.user!.id, id, JSON.stringify({ fullName, phone }))
    .run();

  return json({
    user: {
      id,
      fullName,
      phone,
      role: 'participant',
      isActive: true,
    },
  }, { status: 201 });
}

async function resetParticipantPassword(request: Request, env: Env, userId: string) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  const body = await parseBody<{ password?: string }>(request);
  const password = body?.password ?? '';
  if (password.length < 6) return error('La contraseña debe tener al menos 6 caracteres');

  const target = await env.DB.prepare(
    `SELECT id, full_name, phone_normalized, role, is_active
     FROM users WHERE id = ? LIMIT 1`,
  )
    .bind(userId)
    .first<UserRow>();
  if (!target) return error('Participante no encontrado', 404);

  const passwordHash = await hashPassword(password);
  await env.DB.prepare(
    `UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`,
  )
    .bind(passwordHash, userId)
    .run();

  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
  await env.DB.prepare(
    `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id)
     VALUES (?, 'participant.password_reset', 'user', ?)`,
  )
    .bind(auth.user!.id, userId)
    .run();

  return json({ ok: true });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    try {
      if (request.method === 'GET' && pathname === '/api/health') {
        return json({ ok: true, app: 'prode-tafa', timestamp: new Date().toISOString() });
      }

      if (request.method === 'GET' && pathname === '/api/setup/status') {
        return json({ setupRequired: await setupStatus(env) });
      }

      if (request.method === 'POST' && pathname === '/api/setup/admin') {
        return createFirstAdmin(request, env);
      }

      if (request.method === 'POST' && pathname === '/api/auth/login') {
        return login(request, env);
      }

      if (request.method === 'POST' && pathname === '/api/auth/logout') {
        return logout(request, env);
      }

      if (request.method === 'GET' && pathname === '/api/auth/me') {
        const user = await currentUser(request, env);
        if (!user) return error('No autorizado', 401);
        return json({ user: publicUser(user) });
      }

      if (pathname === '/api/admin/users' && request.method === 'GET') {
        return listUsers(request, env);
      }

      if (pathname === '/api/admin/users' && request.method === 'POST') {
        return createParticipant(request, env);
      }

      const passwordResetMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/password$/);
      if (passwordResetMatch && request.method === 'PUT') {
        return resetParticipantPassword(request, env, decodeURIComponent(passwordResetMatch[1]));
      }

      if (pathname.startsWith('/api/')) {
        return error('Not found', 404);
      }

      return new Response('Not found', { status: 404 });
    } catch (caught) {
      console.error(caught);
      return error('Error interno del servidor', 500);
    }
  },
} satisfies ExportedHandler<Env>;
