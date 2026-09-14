import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import process from "node:process";

/* global fetch */

const url = process.env.SKN_SUPABASE_URL?.replace(/\/$/, "");
const publishableKey = process.env.SKN_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SKN_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !publishableKey || !serviceRoleKey) {
  throw new Error(
    "Defina SKN_SUPABASE_URL, SKN_SUPABASE_PUBLISHABLE_KEY e SKN_SUPABASE_SERVICE_ROLE_KEY.",
  );
}

const marker = `skn045-${Date.now()}`;
const password = `SeekIn!45-${randomUUID()}`;
const users = [];
const results = [];

function record(surface, operation, passed, detail) {
  results.push({ detail, operation, passed, surface });
  assert.equal(passed, true, `${surface}/${operation}: ${detail}`);
}

async function request(
  path,
  { body, key = publishableKey, method = "GET", token } = {},
) {
  const response = await fetch(`${url}${path}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      apikey: key,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    method,
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { data, response };
}

async function createUser(label) {
  const email = `${marker}-${label}@example.test`;
  const created = await request("/auth/v1/admin/users", {
    body: { email, email_confirm: true, password },
    key: serviceRoleKey,
    method: "POST",
    token: serviceRoleKey,
  });
  assert.equal(created.response.status, 200, `falha ao criar usuário ${label}`);
  users.push(created.data.id);

  const link = await request("/auth/v1/admin/generate_link", {
    body: { email, type: "magiclink" },
    key: serviceRoleKey,
    method: "POST",
    token: serviceRoleKey,
  });
  assert.equal(link.response.status, 200, `falha ao gerar sessão ${label}`);
  const verified = await request("/auth/v1/verify", {
    body: { token_hash: link.data.hashed_token, type: "magiclink" },
    method: "POST",
  });
  assert.equal(
    verified.response.status,
    200,
    `falha ao verificar sessão ${label}`,
  );
  return { id: created.data.id, token: verified.data.access_token };
}

async function cleanup() {
  for (const id of users) {
    await request(`/auth/v1/admin/users/${id}`, {
      key: serviceRoleKey,
      method: "DELETE",
      token: serviceRoleKey,
    });
  }
}

try {
  const [userA, userB] = await Promise.all([createUser("a"), createUser("b")]);

  for (const user of [userA, userB]) {
    const profile = await request("/rest/v1/profiles", {
      body: { user_id: user.id },
      method: "POST",
      token: user.token,
    });
    assert.ok(
      [200, 201].includes(profile.response.status),
      "falha ao criar perfil próprio",
    );
  }

  const disciplineB = randomUUID();
  const ownDiscipline = await request("/rest/v1/disciplines", {
    body: {
      id: disciplineB,
      name: "Disciplina sintética B",
      user_id: userB.id,
    },
    method: "POST",
    token: userB.token,
  });
  assert.ok(
    [200, 201].includes(ownDiscipline.response.status),
    "falha no dado próprio de B",
  );

  const authAdmin = await request(`/auth/v1/admin/users/${userB.id}`, {
    token: userA.token,
  });
  record(
    "Auth",
    "ler usuário B pela API administrativa",
    [401, 403].includes(authAdmin.response.status),
    `HTTP ${authAdmin.response.status}`,
  );

  const readB = await request(
    `/rest/v1/disciplines?id=eq.${disciplineB}&select=id,user_id,name`,
    {
      token: userA.token,
    },
  );
  record(
    "Data API",
    "ler registro de B",
    readB.response.status === 200 &&
      Array.isArray(readB.data) &&
      readB.data.length === 0,
    `HTTP ${readB.response.status}; linhas=${Array.isArray(readB.data) ? readB.data.length : "n/a"}`,
  );

  const crossInsert = await request("/rest/v1/disciplines", {
    body: {
      id: randomUUID(),
      name: "Inserção cruzada",
      user_id: userB.id,
    },
    method: "POST",
    token: userA.token,
  });
  record(
    "Data API",
    "inserir para B",
    [401, 403].includes(crossInsert.response.status),
    `HTTP ${crossInsert.response.status}`,
  );

  const crossUpdate = await request(
    `/rest/v1/disciplines?id=eq.${disciplineB}`,
    {
      body: { name: "Alteração cruzada" },
      method: "PATCH",
      token: userA.token,
    },
  );
  record(
    "Data API",
    "alterar registro de B",
    [204, 401, 403].includes(crossUpdate.response.status),
    `HTTP ${crossUpdate.response.status}; operação cruzada não produziu alteração`,
  );

  const crossDelete = await request(
    `/rest/v1/disciplines?id=eq.${disciplineB}`,
    {
      method: "DELETE",
      token: userA.token,
    },
  );
  record(
    "Data API",
    "excluir registro de B",
    [204, 401, 403].includes(crossDelete.response.status),
    `HTTP ${crossDelete.response.status}; operação cruzada não removeu a linha`,
  );

  const stillThere = await request(
    `/rest/v1/disciplines?id=eq.${disciplineB}&select=name`,
    {
      token: userB.token,
    },
  );
  record(
    "Data API",
    "preservar registro de B",
    stillThere.response.status === 200 &&
      stillThere.data?.[0]?.name === "Disciplina sintética B",
    `HTTP ${stillThere.response.status}; proprietário ainda lê o original`,
  );

  const publicFunction = await request("/rest/v1/rpc/foundation_health", {
    body: {},
    method: "POST",
    token: userA.token,
  });
  record(
    "Functions",
    "executar função pública permitida",
    publicFunction.response.status === 200 && publicFunction.data === 1,
    `HTTP ${publicFunction.response.status}; retorno mínimo`,
  );

  const anonymousFunction = await request("/rest/v1/rpc/foundation_health", {
    body: {},
    method: "POST",
  });
  record(
    "Functions",
    "bloquear função para anon",
    [401, 403, 404].includes(anonymousFunction.response.status),
    `HTTP ${anonymousFunction.response.status}`,
  );

  const privateFunction = await request("/rest/v1/rpc/bump_revision", {
    body: {},
    method: "POST",
    token: userA.token,
  });
  record(
    "Functions",
    "não expor função privada",
    [401, 403, 404].includes(privateFunction.response.status),
    `HTTP ${privateFunction.response.status}`,
  );

  const createBucket = await request("/storage/v1/bucket", {
    body: { id: marker, name: marker, public: false },
    method: "POST",
    token: userA.token,
  });
  const bucketsAfterAttempt = await request("/storage/v1/bucket", {
    key: serviceRoleKey,
    token: serviceRoleKey,
  });
  record(
    "Storage",
    "bloquear criação de bucket pelo cliente",
    [400, 401, 403].includes(createBucket.response.status) &&
      bucketsAfterAttempt.response.status === 200 &&
      Array.isArray(bucketsAfterAttempt.data) &&
      !bucketsAfterAttempt.data.some((bucket) => bucket.id === marker),
    `criação HTTP ${createBucket.response.status}; listagem administrativa HTTP ${bucketsAfterAttempt.response.status}; bucket ausente`,
  );

  process.stdout.write(`${JSON.stringify({ marker, results }, null, 2)}\n`);
} finally {
  await cleanup();
}
