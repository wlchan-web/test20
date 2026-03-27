// app/layout.js 
"use client";
import { Inter, Poppins } from 'next/font/google' // 🌟 引用現代字體

const inter = Inter({ subsets: ['latin'] })
const poppins = Poppins({ weight: '400', subsets: ['latin'] }) // Poppins 係一個好親切嘅字體

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant-HK">
      <head>
        {/* 保留原本嘅 katex import */}
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" />
      </head>
      {/* 🌟 1. 換上 Poppins 字體，2. 加個乾淨嘅 light gray 背景 */}
      <body className={poppins.className} style={{ margin: 0, padding: 0, backgroundColor: "#f0f2f5", display: "flex", justifyContent: "center", minHeight: "100vh" }}>
        {children}
      </body>
    </html>
  )
}
