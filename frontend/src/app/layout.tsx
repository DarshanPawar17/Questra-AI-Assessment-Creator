import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Questra — AI Assessment Creator',
  description:
    'Create professional assessments and question papers with AI. Upload study material and generate customized exams instantly.',
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
