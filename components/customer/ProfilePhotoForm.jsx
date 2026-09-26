'use client';
import { useActionState, useEffect, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { updateCustomerPhoto } from '@/lib/actions/customer';
import { Button } from '@/components/ui/button';
import ProfileAvatar from './ProfileAvatar';
import { FormStatus } from './AccountForms';

export default function ProfilePhotoForm({ account }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [state, action, pending] = useActionState(async (previous, form) => {
    const result = await updateCustomerPhoto(previous, form);
    if (result.ok) {
      window.dispatchEvent(new Event('rentra-profile-changed'));
      setFile(null);
    }
    return result;
  }, {});
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const timer = setTimeout(() => setPreview(url), 0);
    return () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
    };
  }, [file]);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="expectedVersion" value={account.version} />
      <div className="flex flex-wrap items-center gap-5">
        <ProfileAvatar
          name={account.name}
          photoUrl={file ? preview : account.photoUrl}
          className="size-24 text-3xl"
        />
        <div className="space-y-2">
          <h2 className="font-semibold">Profile photo</h2>
          <label
            className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-brand-50 focus-within:ring-2 focus-within:ring-brand-500 ${pending ? 'pointer-events-none opacity-50' : ''}`}
          >
            <Camera className="size-4" aria-hidden="true" />
            Choose a photo
            <input
              aria-label="Choose profile photo"
              className="sr-only"
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp"
              disabled={pending || !account.complete}
              onChange={(event) => {
                const next = event.target.files?.[0];
                setError(null);
                if (
                  next &&
                  (next.size > 2 * 1024 * 1024 ||
                    !['image/jpeg', 'image/png', 'image/webp'].includes(next.type))
                ) {
                  setError('Choose a JPG, PNG or WebP photo smaller than 2 MB.');
                  event.target.value = '';
                  setFile(null);
                  return;
                }
                setFile(next ?? null);
              }}
            />
          </label>
          <p className="text-xs text-ink-500">JPG, PNG or WebP · up to 2 MB</p>
        </div>
      </div>
      <p className="text-xs text-ink-500">
        {account.complete
          ? 'Your photo is used as your Rentra avatar. Anyone with its image link can view it.'
          : 'Save your name below to add a photo.'}
      </p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <FormStatus state={state} />
      <div className="flex flex-wrap gap-3">
        {file && (
          <Button type="submit" disabled={pending} className="min-h-11 rounded-xl">
            {pending ? 'Saving…' : 'Save photo'}
          </Button>
        )}
        {account.photoUrl && (
          <Button
            type="submit"
            name="remove"
            value="true"
            variant="ghost"
            disabled={pending}
            className="min-h-11 rounded-xl"
          >
            <Trash2 className="size-4" />
            Remove photo
          </Button>
        )}
      </div>
    </form>
  );
}
