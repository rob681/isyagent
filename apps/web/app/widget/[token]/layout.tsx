export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-transparent">{children}</body>
    </html>
  );
}
