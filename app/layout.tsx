import type { Metadata } from 'next';
import './globals.css';
import './auth.css';
import './nutrition.css';
import './progression.css';

export const metadata: Metadata = {
  title: 'Athleo',
  description: 'Ton espace de suivi sport, nutrition et progression.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
