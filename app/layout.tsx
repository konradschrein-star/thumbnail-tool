import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { Providers } from './providers';
import { validateEnv } from '@/lib/env-validation';
import { purgeOldAssets } from '@/lib/cleanup-service';
import './globals.css';

// Pre-flight environment check & Maintenance
const envCheck = validateEnv();
if (!envCheck.isValid) {
  console.error('[CRITICAL] Missing environment variables:', envCheck.missing);
}
if (envCheck.warnings.length > 0) {
  console.warn('[WARNING] missing secondary environment variables (R2 features may be disabled):', envCheck.warnings);
}

// Background maintenance (server-side)
purgeOldAssets().catch(err => console.error('[MAINTENANCE] Cleanup failed:', err));

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Thumbnail Creator V2",
  description: "YouTube thumbnail generation engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
