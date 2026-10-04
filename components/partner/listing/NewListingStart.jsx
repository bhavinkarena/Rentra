'use client';
import { useActionState, useState } from 'react';
import { createListingFromBasics } from '@/lib/actions/partner';
import { RentraLogo } from '@/components/rentra/Logo';
import Link from '@/components/navigation/NavigationLink';
import { ChapterBar } from './WizardProgress';
import { inputCls } from './SectionPrimitives';
export default function NewListingStart({ categories, verticals = [], progress, venueProgress }) {
  const [state, action, pending] = useActionState(createListingFromBasics, {});
  const choices = ['farmhouse', 'entertainment']
    .map((code) => verticals.find((v) => v.code === code) || { code })
    .filter((v) => categories.some((c) => (c.vertical || 'farmhouse') === v.code));
  const [vertical, setVertical] = useState('farmhouse');
  const shown = categories.filter((c) => (c.vertical || 'farmhouse') === vertical);
  const farmhouseCategory = shown.find((c) => c.slug === 'farmhouse') || shown[0];
  const current = vertical === 'entertainment' ? venueProgress : progress;
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b bg-card p-4">
        <RentraLogo className="h-6 w-auto" />
        <p className="mt-3 text-meta">
          Step {current.stepNumber} of {current.stepTotal} · Type
        </p>
        <ChapterBar chapters={current.chapters} />
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 p-5 sm:p-8">
        <h1 className="text-h1">What would you like to add?</h1>
        <p className="mt-2 text-body text-ink-600">
          Choose the kind of property. Add its location, photos and story next.
        </p>
        <form id="listing-step-form" action={action} className="mt-6 space-y-5">
          <fieldset>
            <legend className="sr-only">Property type</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {choices.map((v) => (
                <label
                  key={v.code}
                  className="flex min-h-16 items-center gap-3 rounded-lg border bg-card p-4"
                >
                  <input
                    type="radio"
                    name="vertical"
                    value={v.code}
                    checked={vertical === v.code}
                    onChange={() => setVertical(v.code)}
                  />
                  <span>
                    {v.code === 'farmhouse' ? 'Farmhouse or villa' : 'Sports or play venue'}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {vertical === 'entertainment' ? (
            <label className="block text-meta font-semibold">
              Category
              <select name="categoryId" required defaultValue="" className={inputCls}>
                <option value="">Choose a category</option>
                {shown.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <input type="hidden" name="categoryId" value={farmhouseCategory?.id || ''} />
          )}
          {Object.values(state.errors || {}).map((e, i) => (
            <p key={i} role="alert" className="text-danger">
              {e}
            </p>
          ))}
          <p className="text-meta text-ink-600">Your draft is private until Rentra approves it.</p>
        </form>
      </main>
      <footer className="flex items-center justify-between border-t bg-card p-4">
        <Link href="/partner/listings" className="min-h-11 p-3">
          Back
        </Link>
        <button
          form="listing-step-form"
          disabled={pending || !shown.length}
          className="min-h-11 rounded-md bg-primary px-6 py-3 text-white"
        >
          {pending ? 'Creating draft…' : 'Continue'}
        </button>
      </footer>
    </div>
  );
}
