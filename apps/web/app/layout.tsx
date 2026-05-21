import { Plus_Jakarta_Sans, IBM_Plex_Mono, Lora } from "next/font/google"
import "@workspace/ui/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@workspace/ui/lib/utils";

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['200', '300', '400', '500', '600', '700', '800'], variable: '--font-sans', display: 'swap' })

const ibmPlexMono = IBM_Plex_Mono({ weight: ['300', '400', '500', '600', '700'], subsets: ['latin'], variable: '--font-mono', display: 'swap' })

const lora = Lora({ subsets: ['latin'], weight: ['400', '500', '600', '700'], style: ['normal', 'italic'], variable: '--font-serif', display: 'swap' })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("dark antialiased", plusJakartaSans.variable, ibmPlexMono.variable, lora.variable, "font-sans")}
    >
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
