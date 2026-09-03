import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono-source", subsets: ["latin"] });

export const metadata: Metadata = { title: "EMW3 Analytics", description: "AI-powered marketing analytics for Bluevua." };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en" className={`${inter.variable} ${mono.variable}`}><body>{children}</body></html>;
}
