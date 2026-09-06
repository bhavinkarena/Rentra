// No-op stand-in for the `server-only` package.
//
// That package throws on import outside a React Server Component, which is
// exactly what we want in the app — it stops lib/auth/* ever being bundled
// into client JavaScript. But verification scripts run these same modules in
// plain node, where the guard has nothing to protect and only gets in the way.
export {};
