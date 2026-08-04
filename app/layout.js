import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/navigation/AppShell";
import AuthProvider from "@/components/auth/AuthProvider";
import { usesDatabaseStorage } from "@/lib/store/shared";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Resume Tailor",
  description: "Tailor your resume to a job description",
};

export default function RootLayout({ children }) {
  const authEnabled = usesDatabaseStorage();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50 text-slate-900">
        <AuthProvider enabled={authEnabled}>
          <AppShell authEnabled={authEnabled}>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
