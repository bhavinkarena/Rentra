import SavedPlaces from '@/components/customer/SavedPlaces';
export const metadata = {
  title: 'Saved places',
  robots: { index: false, follow: false, nocache: true },
};
export default function SavedPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <SavedPlaces />
    </div>
  );
}
