import './globals.css';

export const metadata = {
  title: 'Resume Chat',
  description: 'Chat UI gated by resume upload',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4">{children}</div>
      </body>
    </html>
  );
}
