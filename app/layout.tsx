// app/layout.tsx 

import type { Metadata } from "next"; // 🌟 這是 TS 需要的 metadata 類型 import
import { Inter, Poppins } from 'next/font/google'
import { ReactNode } from 'react'; // 🌟 1. 新增這行：引入 ReactNode 類型

const inter = Inter({ subsets: ['latin'] })
const poppins = Poppins({ weight: '400', subsets: ['latin'] })

// Metadata 設定 (可以保留你之前的)
export const metadata: Metadata = { // 🌟 加入 Metadata 類型
  title: 'AI 陳 Sir 👨‍🏫 幫緊你幫緊你',
  description: '中學數學 24小時在線 AI 導師',
}

// 🌟 2. 修改 RootLayout function，話畀 TS 聽 children 嘅類型係 { children: ReactNode }
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant-HK">
      <head>
        {/* 保留 Katex import */}
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" />
      </head>
      {/* 套用 Poppins 字體 */}
      <body className={poppins.className} style={{ margin: 0, padding: 0, backgroundColor: "#f0f2f5", display: "flex", justifyContent: "center", minHeight: "100vh" }}>
        {children}
      </body>
    </html>
  )
}
