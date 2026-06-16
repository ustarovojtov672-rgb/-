import type { Metadata } from "next";
import { LocalJazzProvider } from "@/components/local-jazz-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prilozyxa Calories",
  description:
    "Бот для трекинга калорий, микроэлементов и следующих приемов пищи.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <LocalJazzProvider>{children}</LocalJazzProvider>
      </body>
    </html>
  );
}
