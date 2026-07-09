import './globals.css';

export const metadata = {
  title: 'Honey-Intranet Orchestrator',
  description: 'Plataforma de señuelos web para detección de intrusos',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
