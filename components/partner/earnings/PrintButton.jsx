'use client';
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden min-h-11 rounded-md border border-border bg-card px-4 font-semibold"
    >
      Print or save as PDF
    </button>
  );
}
