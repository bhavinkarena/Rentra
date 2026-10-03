/** Consistent, scrollable owner record tables, including on small screens. */
export default function OwnerTable({ label, columns, children, empty, minWidth = 680 }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="owner-table relative min-w-0 max-w-full overflow-x-auto rounded-xl border border-border bg-card"
    >
      <table style={{ minWidth }} className="w-full border-collapse text-left text-meta">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                scope="col"
                key={column}
                className="whitespace-nowrap border-b border-border bg-ink-25 px-4 py-3 text-tiny font-semibold text-ink-600"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {empty ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-ink-600">
                {empty}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}
