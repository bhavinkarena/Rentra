'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from '@/components/navigation/NavigationLink';
import ContentBody from './ContentBody';
import { contentCommand } from '@/lib/actions/content';
const input = 'mt-1 block w-full rounded border border-ink-300 bg-white p-3 text-ink-900';
const button = 'min-h-11 rounded bg-ink-900 px-4 py-2 font-semibold text-white disabled:opacity-50';
const title = {
  terms: 'Terms',
  privacy: 'Privacy',
  cancellation: 'Cancellation explanations',
  help: 'Help answers',
  contact: 'Support contact',
};
export function ContentList({ data }) {
  return (
    <section className="space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-bold">Public content</h1>
      <p>
        Prepare, review and publish help and policy copy. Published versions remain available;
        operational booking rules are managed separately.
      </p>
      <ul className="space-y-4">
        {data.items.map((item) => (
          <li key={item.kind} className="rounded border border-ink-200 p-4">
            <Link href={`/admin/content/${item.kind}`} className="text-lg font-semibold underline">
              {title[item.kind]}
            </Link>
            <p className="break-all">Published version: {item.currentVersion}</p>
            <p>Working copy: {item.draft?.state || 'Not started'}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
export function ContentEditor({ data }) {
  const { kind, draft, live, canWrite } = data,
    router = useRouter();
  const [body, setBody] = useState(draft.body),
    [reason, setReason] = useState(draft.reason || ''),
    [dirty, setDirty] = useState(false),
    [reviewed, setReviewed] = useState(false),
    [result, setResult] = useState(null),
    [pending, startTransition] = useTransition();
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const change = (next) => {
    setBody(next);
    setDirty(true);
    setReviewed(false);
    setResult(null);
  };
  const command = (cmd, extra = {}) =>
    startTransition(async () => {
      const value = await contentCommand(kind, {
        command: cmd,
        version: draft.version,
        reason,
        ...extra,
      });
      setResult(value);
      if (value.ok) {
        setDirty(false);
        router.refresh();
      }
    });
  const field = (label, value, set, max = 200, textarea = false) => {
    const Tag = textarea ? 'textarea' : 'input';
    return (
      <label className="block">
        {label}
        <Tag
          className={input}
          value={value}
          maxLength={max}
          onChange={(e) => set(e.target.value)}
          rows={textarea ? 5 : undefined}
        />
      </label>
    );
  };
  const rows = kind === 'help' ? body.faqs : body.sections;
  const updateRow = (i, value) =>
    change({
      ...body,
      [kind === 'help' ? 'faqs' : 'sections']: rows.map((r, n) => (n === i ? value : r)),
    });
  const move = (i, d) => {
    const values = [...rows];
    [values[i], values[i + d]] = [values[i + d], values[i]];
    change({ ...body, [kind === 'help' ? 'faqs' : 'sections']: values });
  };
  return (
    <section className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <Link className="underline" href="/admin/content">
        All public content
      </Link>
      <h1 className="text-2xl font-bold">{title[kind]}</h1>
      <p className="break-all">
        Current publication: {live.version} · Effective {new Date(live.effectiveAt).toISOString()}
      </p>
      <p>
        Draft revision {draft.version} · {draft.state}
      </p>
      <p>
        Publication takes effect immediately. Editing copy cannot change fees, cancellation
        calculations, payment capabilities or accepted bookings.
      </p>
      {canWrite ? (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              command('save', { body });
            }}
            className="space-y-5"
          >
            <fieldset disabled={pending} className="space-y-5">
              <legend className="font-semibold">Working copy</legend>
              {field('Title', body.title, (v) => change({ ...body, title: v }), 160)}
              {kind === 'help' &&
                field('Introduction', body.intro, (v) => change({ ...body, intro: v }), 500, true)}
              {kind === 'contact' ? (
                <>
                  {field('Support email', body.email, (v) => change({ ...body, email: v }), 160)}
                  {field(
                    'WhatsApp number (country code and digits)',
                    body.whatsapp,
                    (v) => change({ ...body, whatsapp: v }),
                    15,
                  )}
                  {field('Staffed hours', body.hours, (v) => change({ ...body, hours: v }), 200)}
                  <p>
                    Timezone: Asia/Kolkata. Leave unavailable channels blank. Review confirms that
                    each supplied channel is authorized and monitored; this does not claim provider
                    verification or guaranteed response times.
                  </p>
                </>
              ) : (
                <div className="space-y-4">
                  {rows.map((row, i) => (
                    <fieldset key={i} className="space-y-3 rounded border border-ink-200 p-4">
                      <legend>
                        {kind === 'help' ? 'Answer' : 'Section'} {i + 1}
                      </legend>
                      {kind === 'help' ? (
                        <>
                          {field(
                            `Question ${i + 1}`,
                            row.question,
                            (v) => updateRow(i, { ...row, question: v }),
                            200,
                          )}
                          {field(
                            `Answer ${i + 1}`,
                            row.answer,
                            (v) => updateRow(i, { ...row, answer: v }),
                            4000,
                            true,
                          )}
                          {field(
                            `Link destination ${i + 1}`,
                            row.href,
                            (v) => updateRow(i, { ...row, href: v }),
                            100,
                          )}
                          {field(
                            `Link text ${i + 1}`,
                            row.link,
                            (v) => updateRow(i, { ...row, link: v }),
                            100,
                          )}
                        </>
                      ) : (
                        <>
                          {field(
                            `Section heading ${i + 1}`,
                            row[0],
                            (v) => updateRow(i, [v, row[1]]),
                            160,
                          )}
                          {field(
                            `Section text ${i + 1}`,
                            row[1],
                            (v) => updateRow(i, [row[0], v]),
                            8000,
                            true,
                          )}
                        </>
                      )}
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          className="min-h-11 underline"
                          disabled={i === 0}
                          onClick={() => move(i, -1)}
                        >
                          Move {i + 1} up
                        </button>
                        <button
                          type="button"
                          className="min-h-11 underline"
                          disabled={i === rows.length - 1}
                          onClick={() => move(i, 1)}
                        >
                          Move {i + 1} down
                        </button>
                        <button
                          type="button"
                          className="min-h-11 underline"
                          disabled={rows.length === 1}
                          onClick={() =>
                            change({
                              ...body,
                              [kind === 'help' ? 'faqs' : 'sections']: rows.filter(
                                (_, n) => n !== i,
                              ),
                            })
                          }
                        >
                          Remove {i + 1}
                        </button>
                      </div>
                    </fieldset>
                  ))}
                  <button
                    className="min-h-11 underline"
                    type="button"
                    disabled={rows.length >= (kind === 'help' ? 40 : 30)}
                    onClick={() =>
                      change({
                        ...body,
                        [kind === 'help' ? 'faqs' : 'sections']: [
                          ...rows,
                          kind === 'help'
                            ? { question: '', answer: '', href: '', link: '' }
                            : ['', ''],
                        ],
                      })
                    }
                  >
                    Add {kind === 'help' ? 'answer' : 'section'}
                  </button>
                </div>
              )}
              {field(
                'Reason for change',
                reason,
                (v) => {
                  setReason(v);
                  setResult(null);
                },
                1000,
                true,
              )}
              <button className={button}>Save draft</button>
            </fieldset>
          </form>
          {dirty && <p role="status">Unsaved changes. Save the working copy before review.</p>}
          {!dirty && draft.version > 0 && draft.state !== 'published' && (
            <section className="space-y-4 rounded border border-ink-200 p-4">
              <h2 className="text-xl font-semibold">Review and publish</h2>
              <label className="flex gap-3">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(e) => {
                    setReviewed(e.target.checked);
                    setResult(null);
                  }}
                />
                I reviewed the exact saved copy, its policy accuracy and any supplied contact
                channels.
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  className={button}
                  disabled={pending || !reviewed}
                  onClick={() => command('review', { confirmed: reviewed })}
                >
                  Record review
                </button>
                <button
                  className={button}
                  disabled={pending || draft.state !== 'reviewed'}
                  onClick={() => command('preview')}
                >
                  Preview publication
                </button>
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <p>You have read-only content access.</p>
          <h2 className="text-xl font-semibold">Saved working copy</h2>
          <h3 className="text-lg font-semibold">{draft.body.title}</h3>
          {kind === 'help' && <p>{draft.body.intro}</p>}
          <ContentBody kind={kind} body={draft.body} />
        </div>
      )}
      {pending && <p role="status">Saving content…</p>}
      {result?.error && (
        <p role="alert" className="rounded border border-red-300 p-4">
          {result.error}
        </p>
      )}
      {['STALE_CONTENT', 'STALE_PREVIEW'].includes(result?.code) && (
        <button className={button} onClick={() => router.refresh()}>
          Reload latest draft
        </button>
      )}
      {result?.preview && (
        <section
          className="space-y-4 rounded border-2 border-ink-900 p-4"
          aria-label="Publication preview"
        >
          <h2 className="text-xl font-bold">Publication preview</h2>
          <p>{result.notice}</p>
          <h3 className="text-lg font-semibold">{result.body.title}</h3>
          {kind === 'help' && <p>{result.body.intro}</p>}
          <ContentBody kind={kind} body={result.body} />
          <button
            className={button}
            disabled={pending || dirty}
            onClick={() => command('publish', { confirmed: true, previewHash: result.previewHash })}
          >
            Confirm publication
          </button>
        </section>
      )}
      <details className="rounded border border-ink-200 p-4">
        <summary className="min-h-11 cursor-pointer font-semibold">Current public copy</summary>
        <h2 className="my-3 text-xl font-semibold">{live.body.title}</h2>
        {kind === 'help' && <p>{live.body.intro}</p>}
        <ContentBody kind={kind} body={live.body} />
      </details>
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Publication history</h2>
        <p>
          Restoring creates a working copy for review and a new publication. Historical versions are
          never overwritten.
        </p>
        <nav aria-label="Publication history pages" className="flex gap-4">
          {data.historyPage > 1 && (
            <Link className="underline" href={`?historyPage=${data.historyPage - 1}`}>
              Newer versions
            </Link>
          )}
          <span>
            Page {data.historyPage} of {data.historyPages}
          </span>
          {data.historyPage < data.historyPages && (
            <Link className="underline" href={`?historyPage=${data.historyPage + 1}`}>
              Older versions
            </Link>
          )}
        </nav>
        {data.history.map((h) => (
          <div key={h.version} className="space-y-2 rounded border border-ink-200 p-4">
            <p className="break-all">
              Version {h.version} · {new Date(h.effective_at).toISOString()}
            </p>
            <p>{h.reason}</p>
            <Link
              className="inline-flex min-h-11 items-center underline"
              href={
                ['terms', 'privacy', 'cancellation'].includes(kind)
                  ? `/policies/${kind}/${h.version}`
                  : `/help/history/${kind}/${h.version}`
              }
            >
              Read version {h.version}
            </Link>
            {canWrite && (
              <button
                type="button"
                disabled={pending || dirty}
                className="ml-4 min-h-11 underline"
                onClick={() => command('restore', { sourceVersion: h.version })}
              >
                Restore {h.version} as draft
              </button>
            )}
          </div>
        ))}
      </section>
    </section>
  );
}
