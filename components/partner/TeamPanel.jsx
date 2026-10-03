'use client';
import { useState } from 'react';
import { Search, ArrowUpRight, Users, ShieldCheck } from 'lucide-react';
import Link from '@/components/navigation/NavigationLink';
import { EmptyState } from '@/components/ui/empty-state';
import { fieldClass } from '@/components/ui/field';
import { MemberStatus, TeamHistory } from './team/TeamDisplay';

export default function TeamPanel({ team, view = 'team' }) {
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState('current');
  const active = team.members.filter((m) => m.state === 'active').length;
  const pending = team.members.filter((m) =>
    ['invited', 'invite_expired'].includes(m.state),
  ).length;
  const removed = team.members.filter((m) => m.state === 'revoked').length;
  const members = team.members.filter(
    (m) =>
      (status === 'all' ||
        (status === 'current'
          ? m.state !== 'revoked'
          : status === 'pending'
            ? ['invited', 'invite_expired'].includes(m.state)
            : m.state === status)) &&
      [m.name, m.phone, ...m.properties.map((p) => p.title)]
        .join(' ')
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-meta text-ink-600">
        <span>
          <strong className="mr-1 text-ink-900 tabular">{active}</strong> Active
        </span>
        <span>
          <strong className="mr-1 text-ink-900 tabular">{pending}</strong> Awaiting sign-in
        </span>
        <span>
          <strong className="mr-1 text-ink-900 tabular">{removed}</strong> Removed
        </span>
      </div>
      <section
        className="overflow-hidden rounded-lg border border-border bg-card"
        aria-label={view === 'history' ? 'Caretaker history' : 'Caretaker directory'}
      >
        <nav
          aria-label="Caretaker views"
          className="flex gap-4 border-b border-border px-5 sm:px-6"
        >
          {[
            ['team', 'Your team'],
            ['history', 'History'],
          ].map(([id, label]) => (
            <Link
              key={id}
              href={id === 'team' ? '/partner/team' : '/partner/team?view=history'}
              aria-current={view === id ? 'page' : undefined}
              className={`inline-flex min-h-14 items-center border-b-2 px-1 text-meta font-semibold ${view === id ? 'border-brand-700 text-brand-800' : 'border-transparent text-ink-500 hover:text-ink-800'}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        {view === 'history' ? (
          <>
            <div className="border-b border-border px-5 py-5 sm:px-6">
              <h2 className="text-h4 font-semibold text-ink-900">Membership history</h2>
              <p className="mt-1 text-meta text-ink-500">
                The latest {team.history.length} recorded{' '}
                {team.history.length === 1 ? 'change' : 'changes'} to your team.
              </p>
            </div>
            <TeamHistory history={team.history} />
          </>
        ) : (
          <>
            {team.members.length ? (
              <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:px-6">
                <label className="relative block min-w-0 flex-1">
                  <span className="sr-only">Search caretakers by name, phone or property</span>
                  <Search
                    className="pointer-events-none absolute top-3.5 left-3 size-4 text-ink-500"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, phone or property"
                    className={`${fieldClass} min-h-11 pl-10`}
                  />
                </label>
                <label className="sm:w-44">
                  <span className="sr-only">Caretaker status</span>
                  <select
                    className={`${fieldClass} min-h-11`}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="current">Current team</option>
                    <option value="all">Everyone</option>
                    <option value="active">Active</option>
                    <option value="pending">Awaiting sign-in</option>
                    <option value="revoked">Removed</option>
                  </select>
                </label>
              </div>
            ) : null}
            {members.length ? (
              <>
                <div
                  aria-hidden="true"
                  className="hidden grid-cols-[1.1fr_1.2fr_1fr_auto] gap-6 border-b border-border bg-ink-25 px-6 py-3 text-tiny font-medium text-ink-500 lg:grid"
                >
                  <span>Caretaker</span>
                  <span>Assigned properties</span>
                  <span>Visit access</span>
                  <span className="w-24">Manage</span>
                </div>
                <ul className="divide-y divide-border">
                  {members.map((m) => (
                    <li
                      key={m.id}
                      className="grid min-w-0 gap-x-6 gap-y-4 px-5 py-6 lg:grid-cols-[1.1fr_1.2fr_1fr_auto] lg:items-center lg:px-6"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className="grid size-11 shrink-0 place-items-center rounded-full bg-ink-100 text-meta font-semibold text-ink-600"
                          aria-hidden="true"
                        >
                          {m.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <Link
                            href={`/partner/team/${m.id}`}
                            className="break-words text-meta font-semibold text-ink-900 hover:underline"
                          >
                            {m.name}
                          </Link>
                          <p className="mt-1 text-meta text-ink-500">{m.phone}</p>
                          <div className="mt-2">
                            <MemberStatus member={m} />
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="mb-1 text-tiny text-ink-500 lg:hidden">Assigned properties</p>
                        <p className="break-words text-meta leading-6 text-ink-700">
                          {m.properties.map((p) => p.title).join(', ') || 'No properties'}
                        </p>
                      </div>
                      <div>
                        <p className="text-meta font-medium text-ink-700">
                          {m.state === 'revoked'
                            ? 'Access ended'
                            : m.permissions.evidence
                              ? 'May record visits'
                              : 'View visits only'}
                        </p>
                        <p className="mt-1 text-tiny text-ink-500">
                          {m.state === 'revoked'
                            ? 'Previous assignments shown'
                            : m.permissions.guestContact !== false
                              ? 'Guest contact on visit day'
                              : 'Guest contact hidden'}
                        </p>
                      </div>
                      <Link
                        href={`/partner/team/${m.id}`}
                        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md border border-border px-3 text-meta font-medium text-ink-700 hover:bg-ink-50"
                      >
                        {m.state === 'revoked' ? 'View details' : 'Manage'}
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
                <p
                  role="status"
                  className="border-t border-border px-5 py-4 text-tiny text-ink-500 sm:px-6"
                >
                  Showing {members.length} of {team.members.length} caretakers
                </p>
              </>
            ) : team.members.length ? (
              <div className="px-5 py-12 text-center">
                <h2 className="text-h4 font-semibold text-ink-900">No caretakers match</h2>
                <p className="mt-2 text-meta text-ink-500">
                  Try a different name, property or status.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setStatus('all');
                  }}
                  className="mt-3 min-h-11 text-meta font-semibold text-brand-800 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="A little help at your properties"
                description="Invite a caretaker to handle arrivals and visits at the properties you choose."
                actionHref={team.properties.length ? '/partner/team/invite' : '/partner/listings'}
                actionLabel={team.properties.length ? 'Invite caretaker' : 'Add property'}
              />
            )}
          </>
        )}
      </section>
      <p className="flex items-start gap-2 text-meta leading-6 text-ink-500">
        <ShieldCheck className="mt-1 size-4 shrink-0" aria-hidden="true" />
        Caretakers only access assigned visits. Prices, earnings, documents and team management stay
        private.
      </p>
    </div>
  );
}
