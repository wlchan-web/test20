"use client";
import { useState, useEffect, useRef } from 'react'; // 🌟 加入 useRef
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import remarkGfm from 'remark-gfm'; // 🌟 新增：表格翻譯糕

export default function Home() {
  const [input, setInput] = useState("");
  const [image, setImage] = useState(null);
  // 🔇 新增：強制停止發聲功能
  const stopSpeech = () => {
    window.speechSynthesis.cancel(); // 呢句就係叫瀏覽器即刻停把聲
  };
  
  // 🌟 修改 1：預設直接放入陳 Sir 嘅開場白，唔好留空
  const [chatLog, setChatLog] = useState([
    { role: "ai", text: "同學你好！我係 AI 陳 Sir 👨‍🏫 影低你唔識嘅數學題，或者直接打字問我啦！" }
  ]);
  
const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // 🌟 新增：用語音發問嘅狀態同法寶
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // 🌟 修改 2：讀取記憶 (防洗腦加固版)
  useEffect(() => {
    const savedChat = localStorage.getItem('chanSirChatLog');
    
    // 確保搵到記憶，而且唔係得個空殼，先至載入
    if (savedChat && savedChat !== "[]") {
      setChatLog(JSON.parse(savedChat));
    }
    
    // 🌟 關鍵神兵利器：等 0.1 秒，確保所有舊對話「坐定定」喺畫面，先至解鎖儲存功能！
    setTimeout(() => {
      setIsLoaded(true);
    }, 100);
  }, []);

  // 🌟 修改 3：儲存記憶 (加固版)
  useEffect(() => {
    // 必須等 isLoaded 解鎖 (即係 0.1 秒後)，先准 Save！防白撞！
    if (isLoaded) {
      localStorage.setItem('chanSirChatLog', JSON.stringify(chatLog));
    }
  }, [chatLog, isLoaded]);

  // 🎙️ 語音發問 Function
  const toggleListening = () => {
    if (isListening) {
      // 如果聽緊，撳多吓就即刻停
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    // 檢查瀏覽器有冇內置語音功能 (Chrome / Safari 通常都有)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("阿 Sir 提提你：你嘅瀏覽器暫時唔支援語音輸入，請轉用最新版 Chrome 或者 Safari 試吓啦！");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-HK'; // 🌟 核心靈魂：設定做廣東話！
    recognition.continuous = false; // 講完一句就會自動停
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      // 將講完嘅字，自動加落輸入框度
      setInput(prev => prev + (prev ? " " : "") + transcript); 
    };
    
    recognition.onerror = (event) => {
      console.error("聽唔清楚：", event.error);
      setIsListening(false);
    };
    
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start(); // 啟動咪高峰！
  };
  
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
          // 🌟 終極防 Error 寫法：過濾對話紀錄
          history: chatLog
            .slice(-6) // 攞最後 6 句
            .filter((msg, index, array) => {
              // 如果成條 List 嘅第一句係 AI (model) 講嘅，就飛走佢，確保由 User 開頭！
              if (index === 0 && msg.role === "ai") return false; 
              return true;
            })
            .map(msg => ({ 
              role: msg.role, 
              text: msg.text 
            })) 
        })
      });
      
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
  <strong>{msg.role === "user" ? "你" : "阿 Sir"}: </strong>
  
  {/* 🌟 新增：陳 Sir 朗讀掣 */}
  {msg.role === "ai" && (
    <button 
      onClick={() => {
        const synth = window.speechSynthesis;
        // 清除 Markdown 符號 (例如 ** 或 #)，廢事佢讀埋出嚟
        const cleanText = msg.text.replace(/[*#_`]/g, ''); 
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'zh-HK'; // 設定做廣東話
        utterance.rate = 0.9; // 🌟 講慢少少，等學生聽得清楚
        synth.speak(utterance);
      }}
      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px" }}
      title="讀畀我聽"
    >
      🔊
    </button>
  )}
</div>
              {msg.img && <img src={msg.img} alt="upload" style={{ maxWidth: "200px", display: "block", marginBottom: "8px", borderRadius: "4px" }} />}
              
              {/* 🌟 翻譯眼鏡發功區 🌟 */}
              {msg.role === "user" ? (
                <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.text}</div>
              ) : (
                <div style={{ wordBreak: "break-word", lineHeight: "1.6" }}>
                  <ReactMarkdown 
                  remarkPlugins={[remarkMath, remarkGfm]} // 🌟 放入 remarkGfm
                  rehypePlugins={[rehypeKatex]}
                  // 🌟 新增 components：教佢點樣畫個靚靚表格
                  components={{
                    table: ({node, ...props}) => <table style={{ borderCollapse: "collapse", width: "100%", margin: "10px 0" }} {...props} />,
                    th: ({node, ...props}) => <th style={{ border: "1px solid #ccc", padding: "8px", backgroundColor: "#007bff", color: "white", textAlign: "left" }} {...props} />,
                    td: ({node, ...props}) => <td style={{ border: "1px solid #ccc", padding: "8px", backgroundColor: "white", color: "black" }} {...props} />
                  }}
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
            placeholder="輸入問題，或者撳咪高峰講嘢..." 
            style={{ flex: 1, padding: "12px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "16px", color: "black", backgroundColor: "white" }} 
          />
          
          {/* 🎙️ 語音發問按鈕 */}
          <button 
            type="button"
            onClick={toggleListening}
            style={{
              padding: "12px",
              backgroundColor: isListening ? "#dc3545" : "#f8f9fa", // 聽緊嗰陣會變紅色警告
              color: isListening ? "white" : "#333",
              border: "1px solid #ccc",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}
            title="用語音發問"
          >
            {isListening ? "🛑 聽緊..." : "🎙️"}
          </button>

      {/* 1. 綠色發送掣 (保留你原本靚靚嗰個) */}
          <button onClick={sendMessage} disabled={isLoading} style={{ padding: "12px 24px", backgroundColor: "#28a745", color: "white", border: "none", borderRadius: "6px", cursor: isLoading ? "not-allowed" : "pointer", fontWeight: "bold", fontSize: "16px", flexShrink: 0 }}>
            發送
          </button>

          {/* 2. 🧹 重新開課按鈕 */}
          <button 
            type="button" 
            onClick={(e) => {
              e.preventDefault(); 
              const initialChat = [
                { role: "ai", text: "同學你好！我係 AI 陳 Sir 👨‍🏫 影低你唔識嘅數學題，或者直接打字問我啦！" }
              ];
              setChatLog(initialChat);
              setInput("");
              setImage(null);
              localStorage.setItem('chanSirChatLog', JSON.stringify(initialChat));
              alert("✅ 已經洗走哂記憶，重新開課！"); 
            }} 
            style={{ 
              padding: "12px 16px", 
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

          {/* 3. 🔇 叫陳 Sir 收聲掣 */}
          <button 
            onClick={stopSpeech} 
            style={{ 
              padding: "12px 16px", 
              backgroundColor: "#ff4d4f", 
              color: "white", 
              border: "none", 
              borderRadius: "6px", 
              cursor: "pointer",
              fontWeight: "bold",
              flexShrink: 0
            }}
          >
            🔇 暫停發聲
          </button>
        </div>
      </div>
    </div>
  );
}