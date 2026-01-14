import { Message } from '@/types';

// Local PII detection using regex patterns
export function detectSensitiveDataLocally(text: string): { hasSensitiveData: boolean; reason: string | null } {
  const patterns = [
    {
      regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      reason: 'Email address detected'
    },
    {
      regex: /\b(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\b/g,
      reason: 'Phone number detected'
    },
    {
      regex: /\b\d{3}-\d{2}-\d{4}\b/g,
      reason: 'SSN-like number detected'
    },
    {
      regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
      reason: 'Credit card number detected'
    },
    {
      regex: /\b\d{1,5}\s+\w+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir)\b/gi,
      reason: 'Physical address detected'
    },
    {
      regex: /\b(?:19|20)\d{2}[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/g,
      reason: 'Full date detected (potential DOB)'
    },
    {
      regex: /\b[A-Z]{2}\d{6,9}\b/g,
      reason: 'Passport-like number detected'
    }
  ];

  for (const pattern of patterns) {
    if (pattern.regex.test(text)) {
      return { hasSensitiveData: true, reason: pattern.reason };
    }
  }

  return { hasSensitiveData: false, reason: null };
}

// Check if message likely contains personal info (for smart filtering)
export function shouldAnalyzeWithAI(text: string): boolean {
  // Already has obvious PII from regex
  const localCheck = detectSensitiveDataLocally(text);
  if (localCheck.hasSensitiveData) {
    return false; // Already detected locally, no need for API
  }

  // Skip very short messages
  if (text.length < 50) {
    return false;
  }

  // Skip code blocks
  if (text.includes('```') || text.match(/^(\s{4}|\t)/gm)) {
    return false;
  }

  // Keywords that suggest personal info
  const personalKeywords = [
    'my name is', 'i live', 'my address', 'born on', 'birth date',
    'my phone', 'contact me', 'email me', 'my email', 'my number',
    'my account', 'my password', 'my id', 'social security'
  ];

  const lowerText = text.toLowerCase();
  return personalKeywords.some(keyword => lowerText.includes(keyword));
}
