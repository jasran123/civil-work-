export default function LoadingSpinner() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6">
      <div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin mb-4" />
      <p className="text-sm text-gray-500 font-medium">Loading 3D Engine & Architect Tools...</p>
    </div>
  );
}
