'use client';
import { useRef, useState } from 'react';
import ConfirmDialog from '@/components/ui/confirm-dialog';
/** Gate the form's submit event, so keyboard submission asks too. */
export default function ConfirmedForm({
  children,
  title,
  description,
  confirmLabel,
  danger = false,
  when = true,
  onSubmit,
  ...props
}) {
  const form = useRef(null),
    confirmed = useRef(false),
    submitter = useRef(null),
    [asking, setAsking] = useState(false);
  return (
    <>
      <form
        {...props}
        ref={form}
        onSubmit={(event) => {
          if (when && !confirmed.current) {
            event.preventDefault();
            submitter.current = event.nativeEvent.submitter;
            setAsking(true);
            return;
          }
          confirmed.current = false;
          onSubmit?.(event);
        }}
      >
        {children}
      </form>
      <ConfirmDialog
        open={asking}
        title={title}
        confirmLabel={confirmLabel}
        danger={danger}
        onCancel={() => setAsking(false)}
        onConfirm={() => {
          setAsking(false);
          confirmed.current = true;
          form.current?.requestSubmit(
            submitter.current?.isConnected ? submitter.current : undefined,
          );
        }}
      >
        <p>{description}</p>
      </ConfirmDialog>
    </>
  );
}
