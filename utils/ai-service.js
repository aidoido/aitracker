const { pool } = require('../server');

class AIService {
  constructor() {
    this.settings = null;
  }

  async getSettings() {
    if (!this.settings) {
      console.log('Loading AI settings from database...');
      const result = await pool.query('SELECT * FROM ai_settings LIMIT 1');
      this.settings = result.rows[0] || {};
      console.log('AI settings loaded:', {
        hasSettings: !!result.rows[0],
        provider: this.settings.provider,
        hasApiKey: !!this.settings.api_key_encrypted,
        modelName: this.settings.model_name,
        repliesEnabled: this.settings.replies_enabled,
        summariesEnabled: this.settings.summaries_enabled
      });
    }
    return this.settings;
  }

  async makeAIRequest(prompt, maxTokens = 1000) {
    const settings = await this.getSettings();

    console.log('AI Settings loaded:', {
      hasApiKey: !!settings.api_key_encrypted,
      provider: settings.provider,
      model: settings.model_name,
      categorizationEnabled: settings.categorization_enabled,
      repliesEnabled: settings.replies_enabled
    });

    if (!settings.api_key_encrypted) {
      throw new Error('AI API key not configured. Please configure your Grok API key in Admin → AI Settings');
    }

    // For now, we'll assume the API key is stored as-is (not encrypted for simplicity)
    // In production, you'd decrypt it here
    const apiKey = settings.api_key_encrypted;

    // Map user-friendly model names to actual API model names
    // x.ai currently supports: grok-beta, grok-vision-beta
    const modelMapping = {
      'grok-beta': 'grok-beta',
      'grok': 'grok-beta',
      'grok-vision-beta': 'grok-vision-beta',
      'openrouter': 'grok-beta', // Fallback for OpenRouter
    };

    // Use the model name directly if it's not in mapping, otherwise map it
    const actualModel = modelMapping[settings.model_name] || settings.model_name || 'grok-beta';

    console.log('Using model:', actualModel, 'for requested model:', settings.model_name);

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: actualModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: parseFloat(settings.temperature) || 0.7,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      let errorDetails = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorDetails += `: ${errorData.error?.message || JSON.stringify(errorData)}`;
      } catch (e) {
        // If we can't parse error response, just use status
        errorDetails += ` (${response.statusText})`;
      }
      throw new Error(`AI API request failed: ${errorDetails}`);
    }

    const data = await response.json();
    console.log('AI API response received, choices:', data.choices?.length);

    if (!data.choices || data.choices.length === 0) {
      throw new Error('AI API returned no response choices');
    }

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
    console.log('Generating AI reply for request:', request.id);

    const settings = await this.getSettings();
    console.log('AI reply settings:', {
      replies_enabled: settings.replies_enabled,
      model_name: settings.model_name,
      temperature: settings.temperature,
      hasApiKey: !!settings.api_key_encrypted
    });

    if (!settings.replies_enabled) {
      throw new Error('AI replies are disabled. Enable them in Admin → AI Settings');
    }

    if (!settings.api_key_encrypted) {
      throw new Error('AI API key not configured. Please configure your Grok API key in Admin → AI Settings');
    }

    const prompt = `You are an Oracle Fusion ERP support specialist. Generate a professional, Oracle Fusion-specific response for this Microsoft Teams support request. Focus on Oracle Fusion applications, modules, and best practices.

Response guidelines:
- 4-8 lines maximum
- Oracle Fusion terminology and solutions
- User-facing (suitable for copy-paste into Teams)
- Include clarifying questions if information is missing
- Provide specific Oracle Fusion navigation steps when relevant
- Suggest escalation to Oracle Support if needed
- Professional and helpful tone
- No mention of AI

Common Oracle Fusion areas: Procurement (PR/PO), Financials, HCM, SCM, Projects, Inventory, General Ledger, Accounts Payable/Receivable, Fixed Assets, Cash Management.

Request details:
- Requester: ${request.requester_name}
- Channel: ${request.channel.replace('_', ' ')}
- Issue: ${request.description}
${request.category_name ? `- Category: ${request.category_name}` : ''}
${request.ai_recommendation ? `- Internal analysis: ${request.ai_recommendation}` : ''}

Generate only the response text, no quotes or additional formatting.`;

    console.log('AI prompt created, making request...');

    try {
      const reply = await this.makeAIRequest(prompt, 500);
      console.log('AI reply generated successfully, length:', reply.length);
      return reply.trim();
    } catch (error) {
      console.error('AI reply generation error:', error.message);
      throw error; // Re-throw to preserve original error
    }
  }

  async generateDailySummary(date) {
    console.log('Generating AI daily summary for date:', date);

    const settings = await this.getSettings();
    console.log('AI summary settings:', {
      summaries_enabled: settings.summaries_enabled,
      hasApiKey: !!settings.api_key_encrypted,
      model_name: settings.model_name
    });

    if (!settings.summaries_enabled) {
      throw new Error('AI summaries are disabled. Enable them in Admin → AI Settings');
    }

    if (!settings.api_key_encrypted) {
      throw new Error('AI API key not configured. Please configure your Grok API key in Admin → AI Settings');
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
