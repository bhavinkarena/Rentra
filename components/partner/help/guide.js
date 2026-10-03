export const topicSlug = (group) =>
  group
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
export const articleHref = (id) => `/partner/help/articles/${encodeURIComponent(id)}`;
