
import express from "express";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static("."));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "文旅职业测评服务运行正常" });
});

app.post("/api/assessment", async (req, res) => {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "服务器尚未配置 DeepSeek API 密钥，请联系管理员。"
      });
    }

    const { answers } = req.body;

    if (!Array.isArray(answers) || answers.length !== 8) {
      return res.status(400).json({
        error: "测评答案格式不正确，请完成全部8道题。"
      });
    }

    const prompt = `
你是一名专业的大学生职业规划顾问，擅长文旅行业岗位分析。
请根据以下大学生职业测评答案生成中文详细报告。

测评答案（每题为0至3的选项编号）：
${JSON.stringify(answers)}

报告必须包含：
1. 测评概览与职业倾向
2. 个人优势及具体表现
3. 待提升能力与潜在挑战
4. 景区接待、酒店运营、研学服务、文旅策划四类岗位的匹配分析
5. 推荐岗位及理由
6. 大学专业学习、实习与就业建议
7. 可执行的30天行动计划，按第1-7天、第8-14天、
   第15-21天、第22-30天分阶段说明。

要求：
- 使用清晰的中文标题和列表。
- 结合答案给出具体建议，不要编造用户没有提供的经历。
- 明确说明结果仅供职业探索参考，不是经过验证的心理或职业诊断。
- 不要声称这些选项能够精确测量真实能力。
`;

    const response = await fetch(
      "https://api.deepseek.com/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: "你是一名严谨、务实的大学生文旅职业规划顾问。"
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.7
        })
      }
    );

    if (!response.ok) {
      console.error("DeepSeek API status:", response.status);
      return res.status(502).json({
        error: "AI 报告生成暂时失败，请检查服务配置或 API 额度。"
      });
    }

    const data = await response.json();
    const report = data.choices?.[0]?.message?.content;

    if (!report) {
      return res.status(502).json({ error: "AI 未返回有效报告。" });
    }

    res.json({ report });
  } catch (error) {
    console.error("Assessment error:", error.message);
    res.status(500).json({ error: "服务器暂时无法生成报告，请稍后重试。" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on port ${port}`);
});
