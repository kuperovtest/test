import os
import logging
from groq import Groq

logger = logging.getLogger(__name__)


class AIClient:
    def __init__(self) -> None:
        api_key = os.getenv("GROQ_API_KEY", "")
        if not api_key:
            raise ValueError("GROQ_API_KEY is not set")
        self.client = Groq(api_key=api_key)
        self.model = os.getenv("AI_MODEL", "llama-3.3-70b-versatile")
        self.system_prompt = os.getenv(
            "AI_SYSTEM_PROMPT",
            "You are a helpful assistant. Reply concisely in the same language as the user's message.",
        )
        self.max_tokens = int(os.getenv("AI_MAX_TOKENS", "1024"))
        self._history: dict[int, list[dict[str, str]]] = {}
        self._max_history = 20

    def _get_history(self, chat_id: int) -> list[dict[str, str]]:
        if chat_id not in self._history:
            self._history[chat_id] = []
        return self._history[chat_id]

    def clear_history(self, chat_id: int) -> None:
        self._history.pop(chat_id, None)

    async def ask(self, chat_id: int, text: str) -> str:
        history = self._get_history(chat_id)
        history.append({"role": "user", "content": text})

        if len(history) > self._max_history:
            history[:] = history[-self._max_history:]

        messages: list[dict[str, str]] = [
            {"role": "system", "content": self.system_prompt},
            *history,
        ]

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,  # type: ignore[arg-type]
                max_tokens=self.max_tokens,
                temperature=0.7,
            )
            reply = response.choices[0].message.content or ""
            history.append({"role": "assistant", "content": reply})
            return reply
        except Exception:
            logger.exception("Groq API error")
            history.pop()
            return "⚠️ AI error — try again later."
