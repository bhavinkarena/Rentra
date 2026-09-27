export function isAccessFailure(error) {
  return [401, 403, 'PORTAL_REDIRECT'].includes(error?.status);
}
export default function PartnerQueryState({ queries, children }) {
  if (queries.some((q) => isAccessFailure(q.error)))
    return (
      <p role="alert" className="p-6">
        Access changed. Please reopen this page after your session is checked.
      </p>
    );
  if (queries.some((q) => !q.currentData?.data)) {
    const failed = queries.some((q) => q.isError);
    return (
      <div className="m-6 rounded-lg border border-border p-6" role="status">
        {failed ? 'Unable to load these records.' : 'Loading records…'}
        {failed && (
          <button className="ml-3 underline" onClick={() => queries.forEach((q) => q.refetch())}>
            Retry
          </button>
        )}
      </div>
    );
  }
  return (
    <>
      {queries.some((q) => q.isError) ? (
        <p role="status" className="px-6 pt-4">
          Showing saved data. Refresh failed.{' '}
          <button className="underline" onClick={() => queries.forEach((q) => q.refetch())}>
            Retry
          </button>
        </p>
      ) : queries.some((q) => q.isFetching) ? (
        <p role="status" className="px-6 pt-4 text-sm">
          Updating…
        </p>
      ) : null}
      {children}
    </>
  );
}
