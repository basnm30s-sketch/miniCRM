// Server component wrapper for static export
// This exports generateStaticParams required for Next.js static export
import VehicleFinanceDetailPage from './page-client'

// Required for static export - returns empty array since vehicle IDs are dynamic
export function generateStaticParams() {
  return []
}

export default VehicleFinanceDetailPage
