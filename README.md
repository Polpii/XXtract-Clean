# XXtract-Clean

Clean your ChatGPT conversation exports by removing sensitive personal information before sharing or archiving.

## Features

- **Automatic PII Detection**: Finds emails, phone numbers, addresses, SSN, and more using regex patterns
- **AI-Powered Deep Scan**: Optional OpenAI-based analysis for enhanced detection
- **Selective Deletion**: Delete entire conversations or individual messages
- **Review Modal**: See all flagged sensitive messages before deletion
- **Export**: Save cleaned conversations as organized .txt files

## Getting Started

### Prerequisites

- Node.js 18+
- OpenAI API key (optional, for Deep AI Scan feature)

### Installation

```bash
npm install
```

### Configuration

Create a `.env.local` file:

```
OPENAI_API_KEY=your_api_key_here
```

### Running the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## How to Use

1. Upload your `conversations.json` file (from ChatGPT data export)
2. Review auto-detected sensitive messages
3. (Optional) Run Deep AI Scan for better detection
4. Delete entire conversations (🗑️ button) or open conversations to select specific messages
5. Click "Review Sensitive Messages" to see all flagged data
6. Export cleaned conversations to .txt

## Deploy on Vercel

This app works on Vercel. Just add your `OPENAI_API_KEY` environment variable in the Vercel project settings.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Polpii/XXtract-Clean)

## Tech Stack

- Next.js 15
- TypeScript
- Tailwind CSS
- OpenAI API (gpt-4o-mini)

## License

MIT
