import { Outfit, IBM_Plex_Mono, Noto_Serif } from "next/font/google"
import "@workspace/ui/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@workspace/ui/lib/utils";

// Preset b5Fxrc2eNU: font = Outfit (sans/body), fontHeading = Noto Serif.
const outfit = Outfit({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'], variable: '--font-sans', display: 'swap' })

const ibmPlexMono = IBM_Plex_Mono({ weight: ['300', '400', '500', '600', '700'], subsets: ['latin'], variable: '--font-mono', display: 'swap' })

const notoSerif = Noto_Serif({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], style: ['normal', 'italic'], variable: '--font-serif', display: 'swap' })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("dark antialiased", outfit.variable, ibmPlexMono.variable, notoSerif.variable, "font-sans")}
    >
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
