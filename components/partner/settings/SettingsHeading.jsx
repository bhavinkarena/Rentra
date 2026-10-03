export default function SettingsHeading({ title, description }) {
  return (
    <header className="mb-7">
      <h1 className="text-h1 font-bold tracking-[-0.03em] text-ink-900">{title}</h1>
      <p className="mt-2 max-w-[65ch] text-meta leading-6 text-ink-600">{description}</p>
    </header>
  );
}
