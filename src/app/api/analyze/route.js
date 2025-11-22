import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// POST /api/analyze
// Body: { resumeText: string, jdText: string }
// Returns: { match: number, strengths: string[], gaps: string[], insights: string, raw: any }
export async function POST(request) {
  try {
    const body = await request.json();
    const resumeText = (body?.resumeText || '').trim();
    const jdText = (body?.jdText || '').trim();

    if (!resumeText || !jdText) {
      return NextResponse.json({ error: 'Missing resumeText or jdText' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Heuristic fallback if no API key: simple keyword overlap
      const resumeWords = new Set(resumeText.toLowerCase().match(/[a-zA-Z][a-zA-Z0-9+_.-]{1,}/g) || []);
      const jdWords = new Set(jdText.toLowerCase().match(/[a-zA-Z][a-zA-Z0-9+_.-]{1,}/g) || []);
      let overlap = 0;
      for (const w of jdWords) if (resumeWords.has(w)) overlap++;
      const match = jdWords.size ? Math.round((overlap / jdWords.size) * 100) : 0;
      return NextResponse.json({ match, strengths: [], gaps: [], insights: 'OpenAI key not configured. Showing naive overlap score.', raw: null });
    }

    const system = `You are an expert technical recruiter. Analyze the candidate resume against the job description.
Return STRICT JSON with this schema:
{
  "match": number,              // 0-100 integer match percentage
  "strengths": string[],       // 3-8 bullet strengths
  "gaps": string[],            // 3-8 bullet gaps or missing skills
  "insights": string           // short narrative (<= 120 words)
}
No markdown, no code fences, JSON only.`;

    const user = `JOB DESCRIPTION:\n\n${jdText.slice(0, 15000)}\n\nRESUME:\n\n${resumeText.slice(0, 15000)}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '<no-body>');
      return NextResponse.json({ error: 'OpenAI error', detail: errText }, { status: res.status });
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // Try to extract JSON substring if model added formatting
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch {}
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      return NextResponse.json({ error: 'Malformed model response', raw: content }, { status: 502 });
    }

    const matchPct = Math.max(0, Math.min(100, Math.round(Number(parsed.match) || 0)));
    const strengths = Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 10) : [];
    const gaps = Array.isArray(parsed.gaps) ? parsed.gaps.slice(0, 10) : [];
    const insights = typeof parsed.insights === 'string' ? parsed.insights : '';

    return NextResponse.json({ match: matchPct, strengths, gaps, insights, raw: data });
  } catch (err) {
    return NextResponse.json({ error: 'Analyze error', detail: String(err?.message || err) }, { status: 500 });
  }
}
