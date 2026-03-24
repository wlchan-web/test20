import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  try {
    const { message, image, history } = await req.json();
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // 🌟 1. 定義你嘅「流水號」Model 陣列 (優先次序由上至下)
    const fallbackModels = [
      "gemini-3.1-flash-lite-preview", // 首選：500次免費配額，最快最輕
      "gemini-flash-lite-latest", 
      "gemini-flash-latest",
      "gemini-3.1-pro-preview", 
      "gemini-3-flash-preview",
      "gemini-2.5-flash", 
      "gemini-2.5-flash-lite",
      "gemini-1.5-flash",      // 次選：15 RPM，穩定可靠
      "gemini-1.5-pro",         // 終極備用：算力最勁但最貴，非必要唔用
    ];

    const formattedHistory = (history || []).map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }] 
    }));

    let contentArray = [message || "請睇圖片中嘅數學題，引導我解答"];
    if (image) {
      const [header, base64Data] = image.split(';base64,');
      contentArray.push({
        inlineData: { data: base64Data, mimeType: header.replace('data:', '') }
      });
    }

    let finalResponseText = null;
    let lastErrorMessage = "";

    // 🌟 2. 開始「自動轉波」迴圈
    for (const currentModelName of fallbackModels) {
      try {
        console.log(`陳 Sir 嘗試緊用大腦: ${currentModelName}...`);
        
        const model = genAI.getGenerativeModel({ 
          model: currentModelName,
          systemInstruction: `你依家係一個專業、有耐性嘅香港中學數學老師。
          請嚴格遵守以下教學原則：
          1. 絕對唔可以提供直接答案！
          2. 使用「蘇格拉底式教學法」，透過反問、俾提示、或者將複雜問題拆解成小步驟，一步步引導學生自己諗出答案。
          3. 語氣要鼓勵性，多啲讚賞學生嘅嘗試。
          4. 請用繁體中文（可夾雜自然嘅廣東話）回覆。`
        });

        const chat = model.startChat({ history: formattedHistory });
        const result = await chat.sendMessage(contentArray);
        
        // 🌟 3. 如果成功攞到答案，就即刻跳出迴圈！
        finalResponseText = await result.response.text();
        console.log(`✅ 成功使用 ${currentModelName} 回覆！`);
        break; 

      } catch (error) {
        // 🌟 4. 如果呢個 Model 炒車 (例如 429 爆 Quota)，就印個 Error，然後迴圈會自動試下一個 Model
        console.warn(`❌ ${currentModelName} 失敗咗，準備試下一個。死因: ${error.message}`);
        lastErrorMessage = error.message;
      }
    }

    // 🌟 5. 如果試晒所有 Model 都失敗 (finalResponseText 依然係 null)
    if (!finalResponseText) {
      throw new Error(`所有大腦都塞車！最後死因: ${lastErrorMessage}`);
    }

    // 成功回傳畀前端
    return new Response(JSON.stringify({ text: finalResponseText }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Vercel Error:", error.message);
    return new Response(JSON.stringify({ 
      error: "阿 Sir 個腦暫時過熱，請等等再試！",
      details: error.message 
    }), { status: 500 });
  }
}
