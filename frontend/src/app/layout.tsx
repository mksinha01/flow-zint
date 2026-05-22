import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "FlowZint — AI Sales Automation",
  description:
    "AI-powered outbound calling, lead qualification, and sales intelligence platform. Automate your sales pipeline with FlowZint.",
  keywords: ["AI sales", "outbound calling", "lead qualification", "sales automation"],
  openGraph: {
    title: "FlowZint — AI Sales Automation",
    description: "Automate outbound sales calls with AI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
