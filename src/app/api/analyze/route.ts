import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const maxDuration = 300; // 5 minutes timeout
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { conversations, apiKey } = await request.json();

    // Utiliser la clé API de l'environnement ou celle fournie par l'utilisateur
    const key = apiKey || process.env.OPENAI_API_KEY;
    
    if (!key) {
      return NextResponse.json(
        { error: 'OpenAI API key missing' },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey: key,
      timeout: 30000 // 30 seconds
    });

    // Collect messages that need AI analysis
    const messagesToAnalyze: Array<{
      convId: string;
      msgId: string;
      text: string;
    }> = [];

    conversations.forEach((conv: any) => {
      conv.messages.forEach((msg: any) => {
        // Only analyze messages that might contain sensitive data
        const text = msg.content || msg.text || '';
        if (text.length > 50 && text.length < 2000) {
          messagesToAnalyze.push({
            convId: conv.id,
            msgId: msg.id,
            text: text
          });
        }
      });
    });

    // Batch analyze messages (10 at a time to avoid timeouts)
    const BATCH_SIZE = 10;
    const results = new Map<string, { hasSensitiveData: boolean; reason: string | null }>();

    for (let i = 0; i < messagesToAnalyze.length; i += BATCH_SIZE) {
      const batch = messagesToAnalyze.slice(i, i + BATCH_SIZE);
      
      const batchText = batch.map((m, idx) => 
        `[Message ${idx + 1}]:\n${m.text.substring(0, 500)}`
      ).join('\n\n');

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Analyze these messages for sensitive personal information that the user might not want to share publicly.

Detect:
- Personal Identifiable Information (PII): full names, email addresses, phone numbers, physical addresses, SSN, passport/ID numbers, birth dates
- Financial information: bank accounts, credit cards, salary details
- Medical/health information: conditions, medications, treatments
- Intimate/private content: sexual discussions, relationships, infidelity, affairs, private family matters
- Personal problems: mental health struggles, personal conflicts, embarrassing situations
- Confidential work information: trade secrets, internal company information
- Precise locations that could identify someone's home or workplace

Respond with JSON array (one per message):
[
  {"index": 1, "hasSensitiveData": true/false, "reason": "brief description or null"},
  ...
]

Ignore:
- First names only
- Generic/public information
- Code/technical variables
- General discussions without personal details`
            },
            {
              role: 'user',
              content: batchText
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        });

        let content = response.choices[0].message.content || '[]';
        // Strip markdown code blocks if present
        content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        const batchResults = JSON.parse(content);

        batchResults.forEach((result: any, idx: number) => {
          if (batch[idx]) {
            const key = `${batch[idx].convId}:${batch[idx].msgId}`;
            results.set(key, {
              hasSensitiveData: result.hasSensitiveData || false,
              reason: result.reason || null
            });
          }
        });
      } catch (error) {
        console.error('Batch analysis error:', error);
        // Continue with next batch
      }

      // Progress logging
      if ((i + BATCH_SIZE) % 50 === 0) {
        console.log(`Analyzed ${Math.min(i + BATCH_SIZE, messagesToAnalyze.length)}/${messagesToAnalyze.length} messages`);
      }
    }

    // Apply results to conversations
    const analyzedConversations = conversations.map((conv: any) => ({
      ...conv,
      messages: conv.messages.map((msg: any) => {
        const key = `${conv.id}:${msg.id}`;
        const result = results.get(key);
        
        return {
          ...msg,
          hasSensitiveData: result?.hasSensitiveData || false,
          sensitiveReason: result?.reason || null
        };
      })
    }));

    return NextResponse.json({ conversations: analyzedConversations });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'Analysis error' },
      { status: 500 }
    );
  }
}
