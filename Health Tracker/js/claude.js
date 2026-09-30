// Minimal Claude API client for the browser (raw fetch, since this app has no build step).
// Uses structured outputs so every answer comes back as JSON matching a schema.
HT.claude = {
  MODELS: [
    { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (most accurate)' },
    { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (faster, cheaper)' },
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (fastest, cheapest)' },
  ],

  hasKey() { return !!HT.store.get().settings.apiKey; },

  async ask({ system, content, schema, maxTokens = 16000 }) {
    const { apiKey, model } = HT.store.get().settings;
    if (!apiKey) throw new Error('Add your Claude API key in Settings first.');

    const body = {
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content }],
      output_config: { format: { type: 'json_schema', schema } },
    };
    const isHaiku = model.startsWith('claude-haiku');
    if (!isHaiku) body.output_config.effort = 'medium';

    // Server-side fallback: if a safety classifier declines, the API retries on another model.
    const withFallback = !isHaiku;
    let res = await HT.claude._post(apiKey, withFallback ? { ...body, fallbacks: 'default' } : body, withFallback);
    if (res.status === 400 && withFallback) {
      const txt = await res.clone().text();
      if (/fallback/i.test(txt)) res = await HT.claude._post(apiKey, body, false);
    }
    if (!res.ok) {
      let msg = `API error ${res.status}`;
      try { const e = await res.json(); msg = e.error?.message || msg; } catch {}
      if (res.status === 401) msg = 'Your API key was rejected. Check it in Settings.';
      if (res.status === 429) msg = 'Rate limited by the API. Wait a moment and try again.';
      throw new Error(msg);
    }
    const data = await res.json();
    if (data.stop_reason === 'refusal') throw new Error('Claude declined this request. Try a different file or model.');
    if (data.stop_reason === 'max_tokens') throw new Error('The answer was too long and got cut off. Try again.');
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    try { return JSON.parse(text); }
    catch { throw new Error('Could not read the answer from Claude. Try again.'); }
  },

  _post(apiKey, body, fallback) {
    const headers = {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };
    if (fallback) headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
    return fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body: JSON.stringify(body) });
  },

  // ---- Bloodwork ----
  BLOOD_SCHEMA: {
    type: 'object',
    additionalProperties: false,
    required: ['test_date', 'overall_status', 'summary', 'markers', 'key_actions'],
    properties: {
      test_date: { type: 'string', description: 'Collection date from the report as YYYY-MM-DD, or empty string if not shown' },
      overall_status: { type: 'string', enum: ['green', 'yellow', 'red'] },
      summary: { type: 'string' },
      key_actions: { type: 'array', items: { type: 'string' } },
      markers: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'category', 'value', 'unit', 'reference_range', 'status', 'explanation', 'recommendation'],
          properties: {
            name: { type: 'string' },
            category: { type: 'string' },
            value: { type: 'string' },
            unit: { type: 'string' },
            reference_range: { type: 'string' },
            status: { type: 'string', enum: ['green', 'yellow', 'red'] },
            explanation: { type: 'string' },
            recommendation: { type: 'string' },
          },
        },
      },
    },
  },

  async evaluateBloodwork(pdfBase64, profile) {
    const who = [
      profile.age && `age ${profile.age}`,
      profile.sex && `sex ${profile.sex}`,
    ].filter(Boolean).join(', ') || 'not provided';
    return HT.claude.ask({
      system: 'You review blood test reports for an informational personal health app. You are not a doctor and the user knows this. Be accurate, plain-spoken and calm.',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
        { type: 'text', text:
`Read this blood test report and evaluate every marker it contains. Person: ${who}.

For each marker give its value, unit and the lab's reference range as printed (or a standard adult range if none is printed), a category (e.g. Lipids, Blood count, Liver, Kidney, Thyroid, Metabolic, Vitamins & minerals, Hormones, Inflammation, Other), and a status:
- green: within range or clinically unremarkable
- yellow: mildly outside range or borderline; worth watching or discussing at the next routine visit
- red: markedly abnormal or a pattern that warrants prompt medical attention

Explain in one or two plain sentences what the marker is and what this result means, and give a short practical recommendation (lifestyle, retest, or see a doctor, as appropriate). Consider patterns across markers, not just single values.

summary: 3 to 5 sentences on overall health from this panel. key_actions: the most important next steps, most urgent first (empty if everything is fine). overall_status: the worst status that matters.` },
      ],
      schema: HT.claude.BLOOD_SCHEMA,
    });
  },

  // ---- Food ----
  FOOD_SCHEMA: {
    type: 'object',
    additionalProperties: false,
    required: ['items', 'confidence', 'notes'],
    properties: {
      confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
      notes: { type: 'string' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'grams', 'kcal', 'protein', 'carbs', 'fat'],
          properties: {
            name: { type: 'string' },
            grams: { type: 'number' },
            kcal: { type: 'number' },
            protein: { type: 'number' },
            carbs: { type: 'number' },
            fat: { type: 'number' },
          },
        },
      },
    },
  },
  FOOD_SYSTEM: 'You are a nutrition estimator for a calorie and macro tracker. Estimate realistic portions and use standard nutrition data (USDA-style values). Protein, carbs and fat are in grams; kcal should be consistent with the macros.',

  async estimateFromPhoto(imgBase64, mediaType, hint) {
    return HT.claude.ask({
      system: HT.claude.FOOD_SYSTEM,
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: imgBase64 } },
        { type: 'text', text: `Identify each food in this photo, estimate the portion in grams, and give calories, protein, carbs and fat for that portion.${hint ? ` Extra info from the user: ${hint}` : ''} In notes, mention anything you were unsure about (e.g. hidden oil, sauce). If there is no food in the photo, return an empty items list and say so in notes.` },
      ],
      schema: HT.claude.FOOD_SCHEMA,
      maxTokens: 4000,
    });
  },

  async estimateFromText(description) {
    return HT.claude.ask({
      system: HT.claude.FOOD_SYSTEM,
      content: [{ type: 'text', text: `Break this meal into its foods and estimate grams, calories, protein, carbs and fat for each: "${description}"` }],
      schema: HT.claude.FOOD_SCHEMA,
      maxTokens: 4000,
    });
  },
};
