const { pool } = require('../server');

class AIService {
  constructor() {
    this.settings = null;
  }

  async getSettings() {
    if (!this.settings) {
      const result = await pool.query('SELECT * FROM ai_settings LIMIT 1');
      this.settings = result.rows[0] || {};
    }
    return this.settings;
  }

  async makeAIRequest(prompt, maxTokens = 1000) {
    const settings = await this.getSettings();

    if (!settings.api_key_encrypted) {
      throw new Error('AI API key not configured');
    }

    // For now, we'll assume the API key is stored encrypted
    // In production, you'd decrypt it here
    const apiKey = settings.api_key_encrypted;

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: settings.model_name || 'grok-beta',
        messages: [{ role: 'user', content: prompt }],
        temperature: settings.temperature || 0.7,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      throw new Error(`AI API request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async categorizeRequest(description) {
    const settings = await this.getSettings();
    if (!settings.categorization_enabled) {
      return { category: null, severity: 'medium', recommendation: null };
    }

    const prompt = `Analyze this support request and categorize it. Return a JSON object with:
- category: Choose from ["Oracle Fusion - Access Issue", "Oracle Fusion - PR/PO", "Finance / Invoice", "Network / VPN", "Teams / Communication", "Training Needed", "General IT"]
- severity: "low", "medium", or "high"
- recommendation: A brief internal recommendation for the support team

Request: "${description}"

Respond with only valid JSON, no other text.`;

    try {
      const response = await this.makeAIRequest(prompt, 300);
      const result = JSON.parse(response);

      return {
        category: result.category || null,
        severity: result.severity || 'medium',
        recommendation: result.recommendation || null
      };
    } catch (error) {
      console.error('AI categorization error:', error);
      return { category: null, severity: 'medium', recommendation: null };
    }
  }

  async generateReply(request) {
    const settings = await this.getSettings();
    if (!settings.replies_enabled) {
      throw new Error('AI replies are disabled');
    }

    const prompt = `Generate a professional, polite response for this Microsoft Teams support request. The response should be:
- 3-6 lines maximum
- User-facing (suitable for copy-paste into Teams)
- Include clarifying questions if information is missing
- Provide clear next steps
- Professional and helpful tone
- No mention of AI

Request details:
- Requester: ${request.requester_name}
- Channel: ${request.channel.replace('_', ' ')}
- Description: ${request.description}
${request.category_name ? `- Category: ${request.category_name}` : ''}
${request.ai_recommendation ? `- Internal note: ${request.ai_recommendation}` : ''}

Generate only the response text, no quotes or additional formatting.`;

    try {
      const reply = await this.makeAIRequest(prompt, 500);
      return reply.trim();
    } catch (error) {
      console.error('AI reply generation error:', error);
      throw new Error('Failed to generate AI reply');
    }
  }

  async generateDailySummary(date) {
    const settings = await this.getSettings();
    if (!settings.summaries_enabled) {
      throw new Error('AI summaries are disabled');
    }

    // Get requests for the date
    const result = await pool.query(`
      SELECT sr.*, c.name as category_name
      FROM support_requests sr
      LEFT JOIN categories c ON sr.category_id = c.id
      WHERE DATE(sr.created_at) = $1
      ORDER BY sr.created_at DESC
    `, [date]);

    const requests = result.rows;

    const prompt = `Generate a daily support summary based on these ${requests.length} requests. Include:
- Total number of requests
- Major issue categories and counts
- Any bottlenecks or repeated problems
- Key insights for management

Requests:
${requests.map(r => `- ${r.requester_name}: ${r.description} (${r.category_name || 'Uncategorized'})`).join('\n')}

Keep the summary concise and actionable.`;

    try {
      const summary = await this.makeAIRequest(prompt, 800);
      return summary;
    } catch (error) {
      console.error('AI summary generation error:', error);
      throw new Error('Failed to generate AI summary');
    }
  }

  async improveKBArticle(problem, solution) {
    const settings = await this.getSettings();
    if (!settings.kb_enabled) {
      return { improved_problem: problem, improved_solution: solution, should_be_kb: true };
    }

    const prompt = `Review this support solution and improve it for the knowledge base. Return a JSON object with:
- improved_problem: A clear, concise problem summary
- improved_solution: An improved, detailed solution
- should_be_kb: boolean, whether this should be added to KB
- confidence: 1-5 rating of how reusable this solution is

Original problem: "${problem}"
Original solution: "${solution}"

Respond with only valid JSON.`;

    try {
      const response = await this.makeAIRequest(prompt, 600);
      const result = JSON.parse(response);

      return {
        improved_problem: result.improved_problem || problem,
        improved_solution: result.improved_solution || solution,
        should_be_kb: result.should_be_kb !== false,
        confidence: Math.min(5, Math.max(1, result.confidence || 3))
      };
    } catch (error) {
      console.error('AI KB improvement error:', error);
      return { improved_problem: problem, improved_solution: solution, should_be_kb: true, confidence: 3 };
    }
  }
}

module.exports = new AIService();
