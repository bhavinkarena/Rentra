export function pickDetailTab(value, tabs) {
  return tabs.some((tab) => tab.key === value) ? value : tabs[0]?.key;
}

/** Navigational record sections preserve list context and repeated compatible parameters. */
export function detailTabHref(basePath, key, tabs, params = {}) {
  const search = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (name === 'tab') continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      if (typeof item === 'string') search.append(name, item);
    }
  }
  const chosen = pickDetailTab(key, tabs);
  if (chosen && chosen !== tabs[0]?.key) search.set('tab', chosen);
  return `${basePath}${search.size ? `?${search}` : ''}`;
}
