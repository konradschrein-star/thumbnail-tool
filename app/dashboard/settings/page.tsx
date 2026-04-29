// Force dynamic rendering to avoid useSearchParams SSR issues
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import SettingsPageClient from './SettingsPageClient';

export default function SettingsPage() {
  return <SettingsPageClient />;
}
