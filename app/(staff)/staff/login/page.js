import { StaffLoginForm } from '@/components/staff/StaffForms';

export const metadata = { title: 'Sign in' };

export default async function StaffLoginPage({ searchParams }) {
  const query = (await searchParams) ?? {};
  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="text-h2 font-bold text-ink-900">Caretaker sign in</h1>
      {query.session === 'ended' ? (
        <p role="status" className="rounded-md bg-warning-bg p-3 text-meta text-amber-900">
          Your caretaker session ended or the owner changed your access. Sign in again, or ask the
          owner for a new link.
        </p>
      ) : null}
      <p className="text-meta text-ink-600">
        Use the mobile number the owner invited. New caretakers join with the owner’s invitation
        link first.
      </p>
      <StaffLoginForm />
    </div>
  );
}
