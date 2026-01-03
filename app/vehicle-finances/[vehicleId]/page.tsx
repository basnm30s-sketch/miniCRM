// Server component wrapper for static export
// This exports generateStaticParams required for Next.js static export
import VehicleFinanceDetailPage from './page-client'

// Required for static export - returns placeholder since vehicle IDs are dynamic
// The actual routing is handled client-side via the Express catch-all route
export async function generateStaticParams(): Promise<{ vehicleId: string }[]> {
  return Promise.resolve([{ vehicleId: 'placeholder' }])
}

export default function Page() {
  return <VehicleFinanceDetailPage />
}
