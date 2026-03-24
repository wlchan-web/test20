import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  try {
    // 🔑 1. 接收埋 history (前端傳過嚟嘅對話紀錄)
    const { message, image, history } = await req.json();

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // 🔑 2. 將「阿 Sir 人設」放入系統預設指令 (systemInstruction)，咁佢就唔會每次都忘記自己係老師
    const model = genAI.getGenerativeModel({ 
      model: "Gemini-3.1-Flash-Lite",
      systemInstruction: `你依家係一個專業、有耐性嘅香港中學數學老師「陳sir」。
      請嚴格遵守以下教學原則：
      1. 絕對唔可以提供直接答案！
      2. 使用「蘇格拉底式教學法」，透過反問、俾提示、或者將複雜問題拆解成小步驟，一步步引導學生自己諗出答案，如果答案正確要先明確回答正確。
      3. 語氣要鼓勵性，多啲讚賞學生嘅嘗試。
      4. 請用繁體中文（可夾雜自然嘅廣東話）回覆。`
    });

    // 🔑 3. 幫 Google 翻譯對話紀錄：將前端嘅 user/ai 轉做 Google 睇得明嘅 user/model
    const formattedHistory = (history || []).map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }] 
    }));

    // 🔑 4. 啟動有記憶嘅對話模式！
    const chat = model.startChat({
      history: formattedHistory,
    });

    // 準備今次嘅新訊息
    let contentArray = [message || "請睇圖片中嘅數學題，引導我解答"];

    if (image) {
      const [header, base64Data] = image.split(';base64,');
      const mimeType = header.replace('data:', '');
      contentArray.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      });
    }

    // 將新訊息傳入去個「記憶對話」入面
    const result = await chat.sendMessage(contentArray);
    const response = await result.response;
    const text = response.text();

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Vercel Error:", error.message);
    return new Response(JSON.stringify({ 
      error: "阿 Sir 諗緊嘢，請等陣！",
      details: error.message 
    }), { status: 500 });
  }
}
