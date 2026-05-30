import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Network Visibility Dashboard',
  description: 'Educational cybersecurity tool for network monitoring and MITM simulation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
