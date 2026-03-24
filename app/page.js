"use client";
import { useState, useEffect } from 'react'; // 🌟 加入 useEffect

// 🌟 新增嘅法寶：引入 Markdown 同 數學公式翻譯器
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // 🌟 呢行好重要！係數學公式嘅字體樣式表

export default function Home() {
  const [input, setInput] = useState("");
  const [image, setImage] = useState(null);
  const [chatLog, setChatLog] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // 🌟 進階版：自動壓縮圖片 Function
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        // 1. 設定最大尺寸 (800px 對 AI 睇數學題已經超級夠清，又極度慳位)
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        // 2. 計返個黃金比例，確保縮細後唔會變形
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        // 3. 開張「隱形畫布」重新畫過張相
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // 4. 將畫布轉返做 Base64 代碼！
        // 用 "image/jpeg" 格式，第二個數字 0.7 代表保留 70% 畫質 (檔案大小會暴跌 90%!)
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
        
        // 5. 將減肥成功嘅相放入系統準備寄出
        setImage(compressedBase64);
      };
    };
  };

  const sendMessage = async () => {
    if (!input && !image) return; 
    
    const currentInput = input;
    const currentImage = image;
    
    setChatLog(prev => [...prev, { role: "user", text: currentInput, img: currentImage }]);
    setIsLoading(true);
    setInput(""); 
    setImage(null); 
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: currentInput, 
          image: currentImage,
          history: chatLog.slice(-6).map(msg => ({ 
            role: msg.role, 
            text: msg.text 
          })) 
        })
      }); // 🌟 關鍵：就係爭咗呢個 `);` 嚟完美閂門！
      
      const data = await res.json();
      
      if (res.ok) {
        setChatLog(prev => [...prev, { role: "ai", text: data.text }]);
      } else {
        const errorMsg = data.error + (data.details ? ` \n🔍 死因：${data.details}` : "");
        setChatLog(prev => [...prev, { role: "ai", text: errorMsg }]);
      }
      
    } catch (error) {
      setChatLog(prev => [...prev, { role: "ai", text: "網絡錯誤，請檢查連線再試一次。" }]);
    }
    
    setIsLoading(false);
  };

  return (
    <div style={{ padding: "30px", maxWidth: "800px", margin: "auto", fontFamily: "sans-serif" }}>
      
      {/* 頂部標題與頭像 */}
      <div style={{ display: "flex", alignItems: "center", gap: "15px", borderBottom: "2px solid #eee", paddingBottom: "15px", marginBottom: "20px" }}>
        <img 
          src="https://api.dicebear.com/8.x/notionists/svg?seed=Chansir&backgroundColor=e2e8f0" 
          alt="阿 Sir 頭像" 
          style={{ width: "70px", height: "70px", borderRadius: "50%", border: "2px solid #007bff", backgroundColor: "white", padding: "2px" }} 
        />
        <div>
          <h1 style={{ margin: 0, fontSize: "26px", color: "#333", fontWeight: "bold" }}>AI陳Sir 幫緊你幫緊你 👨‍🏫</h1>
          <p style={{ margin: "5px 0 0 0", fontSize: "14px", color: "#666" }}>24小時在線 ⚡ 影相打字問數都得</p>
        </div>
      </div>

      {/* 對話顯示區 */}
      <div style={{ height: "600px", overflowY: "auto", border: "1px solid #ccc", padding: "15px", borderRadius: "8px", marginBottom: "15px", backgroundColor: "#f9f9f9" }}>
        {chatLog.length === 0 && <p style={{ color: "#666", textAlign: "center" }}>同學，有咩數學題唔識？影張相或者打字問我啦！</p>}
        
        {chatLog.map((msg, i) => (
          <div key={i} style={{ marginBottom: "15px", textAlign: msg.role === "user" ? "right" : "left" }}>
            <span style={{ display: "inline-block", padding: "15px", borderRadius: "8px", backgroundColor: msg.role === "user" ? "#007bff" : "#e9ecef", color: msg.role === "user" ? "white" : "black", maxWidth: "85%", textAlign: "left" }}>
              <strong>{msg.role === "user" ? "你" : "陳 Sir"}: </strong><br/><br/>
              {msg.img && <img src={msg.img} alt="upload" style={{ maxWidth: "200px", display: "block", marginBottom: "8px", borderRadius: "4px" }} />}
              
              {/* 🌟 翻譯眼鏡發功區 🌟 */}
              {msg.role === "user" ? (
                <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.text}</div>
              ) : (
                <div style={{ wordBreak: "break-word", lineHeight: "1.6" }}>
                  <ReactMarkdown 
                    remarkPlugins={[remarkMath]} 
                    rehypePlugins={[rehypeKatex]}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </div>
              )}
            </span>
          </div>
        ))}
        {isLoading && <p style={{ color: "#888", textAlign: "left" }}>阿 Sir 攞緊粉筆寫字...</p>}
      </div>

      {/* 輸入區 */}
      <div style={{ display: "flex", gap: "10px", flexDirection: "column" }}>
        {image && <p style={{ fontSize: "12px", color: "green", margin: 0 }}>✅ 圖片已選擇</p>}
        <div style={{ display: "flex", gap: "10px" }}>
          <input type="file" accept="image/*" onChange={handleImageUpload} style={{ width: "220px" }} />
          <input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="輸入問題，按 Enter 發送..." 
            style={{ flex: 1, padding: "12px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "16px" }} 
          />
          <button onClick={sendMessage} disabled={isLoading} style={{ padding: "12px 24px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "6px", cursor: isLoading ? "not-allowed" : "pointer", fontWeight: "bold", fontSize: "16px" }}>
            發送
          </button>
{/* 🧹 重新開課按鈕 (終極防死機版) */}
          <button 
            type="button" // 🌟 關鍵 1：講明佢只係一個普通掣，唔好亂咁 Submit！
            onClick={(e) => {
              e.preventDefault(); // 🌟 關鍵 2：截停所有預設動作
              // 重新設定狀態
              setChatLog([
                { role: "ai", text: "同學你好！我係 AI 陳 Sir 👨‍🏫 影低你唔識嘅數學題，或者直接打字問我啦！" }
              ]);
              setInput("");
              setImage(null);
              // 🌟 關鍵 3：彈個視窗確認真係撳到！(測試成功後可以刪除呢行)
              alert("✅ 已經洗腦，重新開課！"); 
            }} 
            style={{ 
              padding: "12px 16px", 
              marginLeft: "8px", 
              backgroundColor: "#ff4d4f", 
              color: "white", 
              border: "none", 
              borderRadius: "6px", 
              cursor: "pointer",
              fontWeight: "bold",
              flexShrink: 0
            }}
          >
            🧹 重新開課
          </button>
        </div>
      </div>
    </div>
  );
}
