const buildFallbackSuggestion = (question) => {
  const cleanQuestion = String(question || "").trim();
  if (!cleanQuestion) {
    return "Share your question and I’ll suggest a helpful answer.";
  }

  return [
    `Here’s a helpful starting point for: ${cleanQuestion}`,
    "",
    "1. Define the core concept clearly.",
    "2. Break the problem into small steps.",
    "3. Share a quick example or formula.",
    "4. Finish with one practical tip.",
  ].join("\n");
};

const answerQuestion = async (req, res, next) => {
  try {
    const question = String(req.body.question || "").trim();
    if (!question) {
      return res.status(400).json({ success: false, message: "Question is required" });
    }

    const provider = process.env.AI_PROVIDER || (process.env.OPENAI_API_KEY ? "openai" : (process.env.GEMINI_API_KEY ? "gemini" : "fallback"));

    if (provider === "openai" && process.env.OPENAI_API_KEY) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a concise student assistant for a campus community." },
            { role: "user", content: question },
          ],
          temperature: 0.4,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI request failed (${response.status})`);
      }

      const data = await response.json();
      const suggestion = data?.choices?.[0]?.message?.content?.trim() || buildFallbackSuggestion(question);
      return res.json({ success: true, provider, data: { suggestion } });
    }

    if (provider === "gemini" && process.env.GEMINI_API_KEY) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || "gemini-1.5-flash"}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Answer this student question concisely:\n\n${question}` }] }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini request failed (${response.status})`);
      }

      const data = await response.json();
      const suggestion = data?.candidates?.[0]?.content?.parts?.map((part) => part.text).join("\n")?.trim() || buildFallbackSuggestion(question);
      return res.json({ success: true, provider, data: { suggestion } });
    }

    return res.json({ success: true, provider: "fallback", data: { suggestion: buildFallbackSuggestion(question) } });
  } catch (error) {
    next(error);
  }
};

module.exports = { answerQuestion };
