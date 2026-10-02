import { formError } from '@/lib/domain/portal-state';

/** Says out loud why a form failed when no single field is to blame. */
export default function FormError({ state }) {
  const message = formError(state);
  return message ? (
    <p
      role="alert"
      className="rounded-md border border-danger/30 bg-danger-bg px-3 py-2 text-meta text-danger"
    >
      {message}
    </p>
  ) : null;
}
