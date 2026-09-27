'use client';
import { runIdentityAction } from '@/lib/auth/identity-signal';
export default function IdentityActionForm({ action, children }) {
  return <form action={(form) => runIdentityAction(action, form)}>{children}</form>;
}
