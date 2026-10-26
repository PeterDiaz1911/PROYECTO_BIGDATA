import assert from "node:assert/strict";

const required = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "TRACKING_CODE",
  "OPERATOR_A_EMAIL",
  "OPERATOR_A_PASSWORD",
  "OPERATOR_B_EMAIL",
  "OPERATOR_B_PASSWORD",
  "OWNER_EMAIL",
  "OWNER_PASSWORD",
  "OTHER_EMAIL",
  "OTHER_PASSWORD",
  "SORTER_EMAIL",
  "SORTER_PASSWORD",
  "INACTIVE_EMAIL",
  "INACTIVE_PASSWORD",
];

for (const name of required) {
  if (!process.env[name]) throw new Error(`Set ${name} in the local process environment.`);
}

const baseUrl = process.env.SUPABASE_URL.replace(/\/+$/, "");
const anonKey = process.env.SUPABASE_ANON_KEY;
const trackingCode = process.env.TRACKING_CODE.trim().toUpperCase();
assert.match(trackingCode, /^SP-PE-[0-9A-F]{32}$/);

async function signIn(email, password) {
  const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const result = await response.json();
  assert.equal(response.ok, true, `Sign-in failed for ${email}: ${result.error_description ?? result.msg ?? response.status}`);
  assert.equal(typeof result.access_token, "string");
  return result.access_token;
}

async function rest(path, token, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      apikey: anonKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const body = await response.text();
  let data = null;
  if (body) {
    try {
      data = JSON.parse(body);
    } catch {
      data = body;
    }
  }
  return { response, data };
}

async function visibleShipment(token) {
  const params = new URLSearchParams({
    select: "tracking_code",
    tracking_code: `eq.${trackingCode}`,
  });
  const { response, data } = await rest(`/rest/v1/shipments?${params}`, token);
  assert.equal(response.ok, true, `Shipment read failed: ${JSON.stringify(data)}`);
  return Array.isArray(data) && data.length === 1;
}

async function deniedRpc(token, name, args, expectedCode) {
  const { response, data } = await rest(`/rest/v1/rpc/${name}`, token, {
    method: "POST",
    body: JSON.stringify(args),
  });
  assert.equal(response.ok, false, `${name} unexpectedly succeeded`);
  if (expectedCode) {
    assert.match(JSON.stringify(data), new RegExp(expectedCode));
  }
}

const [operatorA, operatorB, owner, other, sorter, inactive] = await Promise.all([
  signIn(process.env.OPERATOR_A_EMAIL, process.env.OPERATOR_A_PASSWORD),
  signIn(process.env.OPERATOR_B_EMAIL, process.env.OPERATOR_B_PASSWORD),
  signIn(process.env.OWNER_EMAIL, process.env.OWNER_PASSWORD),
  signIn(process.env.OTHER_EMAIL, process.env.OTHER_PASSWORD),
  signIn(process.env.SORTER_EMAIL, process.env.SORTER_PASSWORD),
  signIn(process.env.INACTIVE_EMAIL, process.env.INACTIVE_PASSWORD),
]);

assert.equal(await visibleShipment(operatorA), true, "Agency A operator should see its shipment");
assert.equal(await visibleShipment(operatorB), false, "Agency B operator must not see Agency A shipment");
assert.equal(await visibleShipment(owner), true, "Owner should see the shipment");
assert.equal(await visibleShipment(other), false, "Unrelated customer must not see the shipment");
assert.equal(await visibleShipment(inactive), false, "Inactive customer must not see shipments");

await deniedRpc(operatorB, "update_shipment_status", {
  p_tracking_code: trackingCode,
  p_status: "classified",
  p_note: "Cross-agency API probe",
}, "shipment_not_found");
await deniedRpc(sorter, "update_shipment_status", {
  p_tracking_code: trackingCode,
  p_status: "classified",
  p_note: "Unassigned API probe",
}, "shipment_assignment_required");
await deniedRpc(owner, "create_shipment", {
  p_customer_email: process.env.OTHER_EMAIL,
  p_destination: "Must not persist",
  p_public_description: "Documentos",
  p_service: "standard",
  p_weight_kg: 1,
  p_contents: "Must not persist",
}, "operator_role_required");
await deniedRpc(inactive, "create_shipment", {
  p_customer_email: process.env.OWNER_EMAIL,
  p_destination: "Must not persist",
  p_public_description: "Documentos",
  p_service: "standard",
  p_weight_kg: 1,
  p_contents: "Must not persist",
}, "operator_role_required");
await deniedRpc(null, "lookup_public_tracking", {
  p_tracking_code: trackingCode,
});

const { response: anonymousRead } = await rest(
  `/rest/v1/shipments?select=tracking_code&tracking_code=eq.${encodeURIComponent(trackingCode)}`,
);
assert.equal(anonymousRead.ok, false, "Anonymous table reads must be denied");

console.log("Direct Supabase API permission checks passed. No shipment data was mutated.");
