'use client';
import Form from 'next/form';
import { useFormStatus } from 'react-dom';
import NavigationProgress from './NavigationProgress';
function Pending() {
  const { pending } = useFormStatus();
  return <NavigationProgress active={pending} />;
}
export default function NavigationForm({ children, ...props }) {
  return (
    <Form {...props}>
      {children}
      <Pending />
    </Form>
  );
}
