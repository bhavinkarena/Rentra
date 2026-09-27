export default function Loading() {
  return (
    <div role="status" className="px-6 py-4">
      <span className="sr-only">Opening page</span>
      <div aria-hidden="true" className="h-1 rounded-full bg-brand-100 motion-safe:animate-pulse" />
    </div>
  );
}
