import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Amieira Admin',
    description: 'Staff management portal',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="antialiased min-h-screen text-[#18230F]">
                {children}
            </body>
        </html>
    );
}
