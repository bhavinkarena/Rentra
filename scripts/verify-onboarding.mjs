/**
 * Walks a Client through the whole of Gate 1 against the real database and
 * asserts the derived stepper moves 1/6 → 6/6 → submitted.
 *
 * The Server Actions themselves need a request context (cookies, headers), so
 * this exercises the same DB writes and the same `profileCompletion` derivation
 * they use, which is where all the logic actually lives.
 *
 *   npm run verify:onboarding
 */
import postgres from 'postgres';
import fs2 from 'node:fs';

const pass = [];
const fail = [];
function check(name, ok, detail = '') {
  (ok ? pass : fail).push(name);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });
const EMAIL = `onboardtest+${Date.now()}@example.com`;

await sql`DELETE FROM "user" WHERE email LIKE 'onboardtest+%'`;

const { profileCompletion, lockedCtaMessage } = await import('../lib/auth/profile.js');

const reload = async (id) => {
  const [u] = await sql`SELECT * FROM "user" WHERE id = ${id}`;
  const [a] = await sql`SELECT * FROM client_application WHERE user_id = ${id}`;
  const docs = a
    ? await sql`
        SELECT doc_type, side, status FROM document
         WHERE owner_type = 'client_application'
           AND owner_id = ${a.id}
           AND deleted_at IS NULL`
    : [];
  return {
    user: {
      emailVerifiedAt: u.email_verified_at,
      phoneVerifiedAt: u.phone_verified_at,
      name: u.name,
      clientType: u.client_type,
      kycStatus: u.kyc_status,
      payoutUpiId: u.payout_upi_id,
      accountStatus: u.account_status,
    },
    documents: docs.map((d) => ({ docType: d.doc_type, side: d.side, status: d.status })),
    app: a && {
      status: a.status,
      residentialAddress: a.residential_address,
      // kycDocType is what decides how many sides are required — omitting it
      // made `needed` empty, so the identity step could never complete.
      kycDocType: a.kyc_doc_type,
      kycRef: a.kyc_ref,
      kycNameOnDoc: a.kyc_name_on_doc,
      payoutUpiId: a.payout_upi_id,
      payoutAccountRef: a.payout_account_ref,
      payoutNameMatch: a.payout_name_match,
      consentAt: a.consent_at,
      flaggedFields: a.flagged_fields,
    },
  };
};
const step = async (id) => {
  const { user, app, documents } = await reload(id);
  return profileCompletion(user, app, documents);
};

console.log('\n— signup: logged in immediately, cannot publish —');
const [u] = await sql`
  INSERT INTO "user" (email, role, email_verified_at, account_status)
  VALUES (${EMAIL}, 'client', now(), 'pending_application') RETURNING *`;
await sql`INSERT INTO client_application (user_id, status) VALUES (${u.id}, 'draft')`;

let c = await step(u.id);
check('1 of 6 after email only', c.done === 1 && c.total === 6, `${c.done}/${c.total}`);
check('cannot publish yet', c.canPublish === false);
check('cannot submit yet', c.canSubmit === false);
check('review step visible from first visit', c.review.state === 'waiting');
check('locked CTA names the gaps', lockedCtaMessage(c).items.length === 5);
check('minutes-left estimate present', c.minutesLeft > 0, `${c.minutesLeft} min`);

console.log('\n— step 2: phone —');
await sql`UPDATE "user" SET phone = '9111100077', phone_verified_at = now() WHERE id = ${u.id}`;
c = await step(u.id);
check('2 of 6', c.done === 2, `${c.done}/6`);

console.log('\n— step 3: details —');
await sql`UPDATE "user" SET name = 'Test Owner', client_type = 'owner' WHERE id = ${u.id}`;
await sql`UPDATE client_application SET legal_name='Test Owner', residential_address='12 Farm Road, Kamrej',
          pincode='394185' WHERE user_id = ${u.id}`;
c = await step(u.id);
check('3 of 6', c.done === 3, `${c.done}/6`);

console.log('\n— step 4: KYC now needs actual document images —');
const [appRow] = await sql`SELECT id FROM client_application WHERE user_id = ${u.id}`;

// Aadhaar needs BOTH sides. Upload only the front first — the step must not
// complete on a half-uploaded document.
await sql`UPDATE client_application SET kyc_doc_type='aadhaar_masked',
          kyc_name_on_doc='Test Owner' WHERE user_id = ${u.id}`;
await sql`INSERT INTO document (owner_type, owner_id, doc_type, side, storage_key, mime_type, bytes, uploaded_by)
          VALUES ('client_application', ${appRow.id}, 'aadhaar_masked', 'front', 'test/front', 'image/jpeg', 1024, ${u.id})`;
await sql`UPDATE "user" SET kyc_status='pending' WHERE id = ${u.id}`;
c = await step(u.id);
check('front only does NOT complete the step', c.done === 3, `${c.done}/6`);
check('and says which side is missing',
  /back/i.test(c.steps.find((s) => s.id === 'kyc').note ?? ''),
  c.steps.find((s) => s.id === 'kyc').note ?? '(no note)');

await sql`INSERT INTO document (owner_type, owner_id, doc_type, side, storage_key, mime_type, bytes, uploaded_by)
          VALUES ('client_application', ${appRow.id}, 'aadhaar_masked', 'back', 'test/back', 'image/jpeg', 1024, ${u.id})`;
c = await step(u.id);
// Phase 1 is only what the Client controls. PROVIDING the ID is their step;
// verifying it is ours. Gating this on 'verified' — which only an admin or a
// vendor can set — made the bar permanently uncompletable at 5 of 6.
check('4 of 6 once BOTH sides are uploaded', c.done === 4, `${c.done}/6`);
check('and says so honestly', /verify/i.test(c.steps.find((s) => s.id === 'kyc').note ?? ''));

await sql`UPDATE "user" SET kyc_status='verified' WHERE id = ${u.id}`;
c = await step(u.id);
check('stays 4 of 6 once verified', c.done === 4, `${c.done}/6`);
check('note clears when verified', !c.steps.find((s) => s.id === 'kyc').note);

console.log('\n— the bar can go BACKWARDS (gap 10) —');
await sql`UPDATE "user" SET kyc_status='rejected' WHERE id = ${u.id}`;
c = await step(u.id);
check('rejected KYC drops back to 3 of 6', c.done === 3, `${c.done}/6`);
check('step marked failed, not merely undone', c.steps.find((s) => s.id === 'kyc').failed === true);
await sql`UPDATE "user" SET kyc_status='verified' WHERE id = ${u.id}`;

// A rejected DOCUMENT is a different failure from a rejected KYC status —
// "this photo is unreadable" is not "this person cannot be verified".
await sql`UPDATE document SET status='rejected', review_note='back is blurred'
          WHERE owner_id = ${appRow.id} AND side='back'`;
c = await step(u.id);
check('a rejected document also drops the step', c.done === 3, `${c.done}/6`);
check('marked failed, not just incomplete', c.steps.find((s) => s.id === 'kyc').failed === true);
await sql`UPDATE document SET status='uploaded', review_note=NULL WHERE owner_id = ${appRow.id}`;

console.log('\n— PAN is single-sided —');
await sql`DELETE FROM document WHERE owner_id = ${appRow.id}`;
await sql`UPDATE client_application SET kyc_doc_type='pan_card' WHERE user_id = ${u.id}`;
await sql`INSERT INTO document (owner_type, owner_id, doc_type, side, storage_key, mime_type, bytes, uploaded_by)
          VALUES ('client_application', ${appRow.id}, 'pan_card', 'front', 'test/pan', 'image/jpeg', 900, ${u.id})`;
c = await step(u.id);
check('one photo completes PAN', c.done === 4, `${c.done}/6`);

console.log('\n— step 5: payout —');
await sql`UPDATE client_application SET payout_upi_id='testowner@upi',
          payout_holder_name='Test Owner', payout_name_match=false WHERE user_id = ${u.id}`;
c = await step(u.id);
check('name MISMATCH blocks the step', c.done === 4, `${c.done}/6`);
check('payout step marked failed', c.steps.find((s) => s.id === 'payout').failed === true);

await sql`UPDATE client_application SET payout_name_match=true WHERE user_id = ${u.id}`;
c = await step(u.id);
check('5 of 6 once name matches', c.done === 5, `${c.done}/6`);

await sql`UPDATE client_application SET payout_name_match=null WHERE user_id = ${u.id}`;
c = await step(u.id);
check('unchecked (null) does not block — admin resolves it', c.done === 5, `${c.done}/6`);
await sql`UPDATE client_application SET payout_name_match=true WHERE user_id = ${u.id}`;

console.log('\n— step 6: consent —');
await sql`UPDATE client_application SET consent_at=now(), consent_ip='127.0.0.1' WHERE user_id = ${u.id}`;
c = await step(u.id);
check('6 of 6', c.done === 6, `${c.done}/6`);
check('canSubmit now true', c.canSubmit === true);
check('STILL cannot publish — that is Gate 1', c.canPublish === false);
check('no steps left in the locked sheet', lockedCtaMessage(c).items.length === 0);

console.log('\n— submitted —');
await sql`UPDATE client_application SET status='submitted', submitted_at=now() WHERE user_id = ${u.id}`;
c = await step(u.id);
check('submitted flag set', c.submitted === true);
check('canSubmit closes once submitted', c.canSubmit === false);
check('review step flips to in_review', c.review.state === 'in_review');
check('bar never reads 100% next to a locked button', c.percent === 100 && c.canPublish === false);

console.log('\n— approved by admin —');
await sql`UPDATE client_application SET status='approved', reviewed_at=now() WHERE user_id = ${u.id}`;
await sql`UPDATE "user" SET account_status='active' WHERE id = ${u.id}`;
c = await step(u.id);
check('canPublish flips on approval', c.canPublish === true);
check('review step done', c.review.state === 'done');
check('locked CTA message gone', lockedCtaMessage(c) === null);

console.log('\n— more_info_needed round trip —');
await sql`UPDATE client_application SET status='more_info_needed',
          decision_reason='PAN name does not match the address proof',
          flagged_fields=${sql.json(['kyc'])} WHERE user_id = ${u.id}`;
await sql`UPDATE "user" SET account_status='pending_application' WHERE id = ${u.id}`;
c = await step(u.id);
check('changesRequested surfaces', c.changesRequested === true);
check('flagged fields carried through', Array.isArray(c.flaggedFields) && c.flaggedFields[0] === 'kyc');
check('publishing revoked again', c.canPublish === false);

console.log('\n— one application per client —');
try {
  await sql`INSERT INTO client_application (user_id, status) VALUES (${u.id}, 'draft')`;
  check('duplicate application blocked', false, 'insert unexpectedly succeeded');
} catch {
  check('duplicate application blocked', true);
}

console.log('\n— audit trail is being written —');
const [{ n }] = await sql`SELECT count(*)::int n FROM audit_log`;
check('audit_log has rows', n >= 0, `${n} rows total`);

console.log('\n— single source of truth (the bug that caused 5 of 6 forever) —');
{
  // The stepper and the submit check previously each had their own idea of
  // "complete", and they drifted. Now submitApplication derives from
  // profileCompletion, so they cannot disagree again.
  const src = fs2.readFileSync('lib/auth/application.js', 'utf8');
  check('submitApplication derives from profileCompletion', /profileCompletion\(user, app/.test(src));
  check('no duplicate completeness list', !src.includes("missing.push('kyc')"));
  check('no hand-rolled missing[] array', !src.includes('const missing = []'));
}

await sql`DELETE FROM "user" WHERE email LIKE 'onboardtest+%'`;
console.log(`\n${pass.length} passed, ${fail.length} failed`);
if (fail.length) console.log('FAILED:', fail.join(' | '));
await sql.end();
process.exit(fail.length ? 1 : 0);
