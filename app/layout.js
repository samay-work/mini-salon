import "./globals.css";
export const metadata = { title: "Glow Mini Salon - Book an appointment", description: "Book your salon appointment online." };
export default function RootLayout({ children }) {
  return (
    <html lang="en"><head>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700&family=DM+Sans:wght@400;500;700&display=swap" />
    </head><body>{children}</body></html>
  );
}
