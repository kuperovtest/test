# Telegram AI Userbot

Telegram userbot that answers messages using a free LLM (Llama 3.3 70B via [Groq](https://groq.com) free tier).

## Features

- `.ai <text>` — ask AI and replace your message with the response
- `.clear` — clear conversation history for the current chat
- `.help` — show available commands
- **Auto-reply** mode — automatically respond to all incoming private messages
- Per-chat conversation memory (last 20 messages)

## Setup

### 1. Get Telegram API credentials

1. Go to [my.telegram.org](https://my.telegram.org)
2. Log in with your phone number
3. Go to **API development tools**
4. Create an application — copy **API ID** and **API Hash**

### 2. Get a free Groq API key

1. Sign up at [console.groq.com](https://console.groq.com)
2. Go to **API Keys** → create a new key
3. Copy the key (it's free, no credit card required)

### 3. Install and run

```bash
# Clone the repo
git clone https://github.com/kuperovtest/telegram-ai-userbot.git
cd telegram-ai-userbot

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure
cp .env.example .env
# Edit .env with your credentials

# Run
python bot.py
```

On the first run, Telegram will send a verification code to your phone. Enter it in the terminal.

## Configuration

All settings are in `.env`:

| Variable | Description | Default |
|---|---|---|
| `TELEGRAM_API_ID` | Telegram API ID | — |
| `TELEGRAM_API_HASH` | Telegram API Hash | — |
| `TELEGRAM_PHONE` | Phone number | `+85293181485` |
| `GROQ_API_KEY` | Groq API key | — |
| `AI_MODEL` | LLM model | `llama-3.3-70b-versatile` |
| `AI_SYSTEM_PROMPT` | System prompt for AI | Default helpful assistant |
| `AI_MAX_TOKENS` | Max tokens in response | `1024` |
| `BOT_PREFIX` | Command prefix | `.ai` |
| `AUTO_REPLY` | Auto-reply to PMs | `false` |

## Usage

In any Telegram chat, type:

```
.ai What is the capital of France?
```

The message will be replaced with the AI response.

To enable automatic replies to all incoming private messages, set `AUTO_REPLY=true` in `.env`.

## License

MIT
