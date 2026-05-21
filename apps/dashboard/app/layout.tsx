import {
  Plus_Jakarta_Sans,
  IBM_Plex_Mono,
  Lora,
  Inter,
  JetBrains_Mono,
  Instrument_Serif,
} from "next/font/google"

import "@workspace/ui/globals.css"
import { Providers } from "@/components/providers"
import { cn } from "@workspace/ui/lib/utils"

// ── Violet Grid v6 (deep-link only since the May 2026 promotion) ───────────
// `preload: false` — these fonts are only used on detail/create flows reached
// by deep link. Loading them lazily eliminates the "preloaded but not used"
// console warnings on the default Paper Ops Console pages and stops the
// browser from racing 4-5 unused woff2 files into every initial paint.
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
  preload: false,
})

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  preload: false,
})

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
  preload: false,
})

// ── Paper Ops Console (default since May 2026 promotion) ───────────────────
// Loaded here per LAW 4 (fonts only in app/layout.tsx). Preloaded — this is
// the default visual surface, so the first paint should have them ready.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--paper-font-display",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--paper-font-mono",
  display: "swap",
})

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--paper-font-serif",
  display: "swap",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        plusJakartaSans.variable,
        ibmPlexMono.variable,
        lora.variable,
        inter.variable,
        jetbrainsMono.variable,
        instrumentSerif.variable,
        "font-sans"
      )}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
