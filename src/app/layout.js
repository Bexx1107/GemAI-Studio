import "./globals.css";

export const metadata = {
  title: "GemAI Studio | Premium AI Generation",
  description: "Next-generation AI image generation platform powered by Gemini.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="main-container">
          <div className="ambient-glow" />
          {children}
        </div>
      </body>
    </html>
  );
}
