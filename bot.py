#!/usr/bin/env python3
"""Telegram AI Userbot — answers messages using a free LLM via Groq."""

import os
import sys
import logging

from dotenv import load_dotenv
from telethon import TelegramClient, events

from ai_client import AIClient

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("userbot")

API_ID = os.getenv("TELEGRAM_API_ID", "")
API_HASH = os.getenv("TELEGRAM_API_HASH", "")
PHONE = os.getenv("TELEGRAM_PHONE", "")
PREFIX = os.getenv("BOT_PREFIX", ".ai")
AUTO_REPLY = os.getenv("AUTO_REPLY", "false").lower() == "true"

if not API_ID or not API_HASH:
    sys.exit("Set TELEGRAM_API_ID and TELEGRAM_API_HASH in .env")

client = TelegramClient("userbot", int(API_ID), API_HASH)
ai = AIClient()


# ── Command: .ai <text> (outgoing messages) ─────────────────────────
@client.on(events.NewMessage(outgoing=True, pattern=rf"^{PREFIX}\s+(.+)"))  # type: ignore[misc]
async def on_ai_command(event: events.NewMessage.Event) -> None:
    """User sends `.ai <question>` — edit the message with the AI reply."""
    query = event.pattern_match.group(1)
    await event.edit("⏳ Thinking…")
    reply = await ai.ask(event.chat_id, query)
    await event.edit(reply)


# ── Command: .clear (outgoing) ──────────────────────────────────────
@client.on(events.NewMessage(outgoing=True, pattern=r"^\.clear$"))  # type: ignore[misc]
async def on_clear(event: events.NewMessage.Event) -> None:
    """Clear AI conversation history for the current chat."""
    ai.clear_history(event.chat_id)
    await event.edit("🗑 History cleared.")


# ── Command: .help (outgoing) ───────────────────────────────────────
@client.on(events.NewMessage(outgoing=True, pattern=r"^\.help$"))  # type: ignore[misc]
async def on_help(event: events.NewMessage.Event) -> None:
    """Show available commands."""
    help_text = (
        "**AI Userbot Commands**\n"
        f"`{PREFIX} <text>` — ask AI\n"
        "`.clear` — clear chat history\n"
        "`.help` — this message\n"
    )
    if AUTO_REPLY:
        help_text += "\n_Auto-reply to incoming PMs is ON_"
    await event.edit(help_text)


# ── Auto-reply to incoming private messages ─────────────────────────
@client.on(events.NewMessage(incoming=True, func=lambda e: e.is_private))  # type: ignore[misc]
async def on_incoming_pm(event: events.NewMessage.Event) -> None:
    """Automatically reply to incoming private messages with AI."""
    if not AUTO_REPLY:
        return
    text = event.raw_text
    if not text:
        return
    reply = await ai.ask(event.chat_id, text)
    await event.reply(reply)


async def main() -> None:
    logger.info("Starting userbot for %s …", PHONE)
    await client.start(phone=PHONE)
    me = await client.get_me()
    logger.info("Logged in as %s (id=%s)", me.first_name, me.id)  # type: ignore[union-attr]
    logger.info("Commands: %s <text> | .clear | .help", PREFIX)
    if AUTO_REPLY:
        logger.info("Auto-reply to incoming PMs is ENABLED")
    await client.run_until_disconnected()


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
