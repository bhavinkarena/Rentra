import { api } from './client';
export const publicContent = (kind, version) =>
  api.get(`/discovery/content/${kind}${version ? '/' + encodeURIComponent(version) : ''}`, {
    anonymous: true,
    cache: 'no-store',
  });

// The optional marketing widget stays cacheable; publication expires this tag.
export const publicContact = () =>
  api.get('/discovery/content/contact', {
    anonymous: true,
    next: { revalidate: 300, tags: ['public-content-contact'] },
  });
