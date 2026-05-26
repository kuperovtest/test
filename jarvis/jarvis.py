"""Jarvis PC Assistant — main application."""

import os
import json
import subprocess
import platform
import shutil
import datetime
import socket
import signal
from pathlib import Path

import psutil
from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config["SECRET_KEY"] = os.urandom(24).hex()
socketio = SocketIO(app, cors_allowed_origins="*")

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
AI_MODEL = os.environ.get("AI_MODEL", "llama-3.3-70b-versatile")
BLOCKED_PATTERNS = [
    p.strip()
    for p in os.environ.get(
        "BLOCKED_COMMANDS",
        "rm -rf /,mkfs,dd if=,:(){ :|:& };:",
    ).split(",")
    if p.strip()
]

conversation_history: list[dict[str, str]] = []

# ---------------------------------------------------------------------------
# Built-in command handlers
# ---------------------------------------------------------------------------

def get_system_info() -> str:
    uname = platform.uname()
    boot = datetime.datetime.fromtimestamp(psutil.boot_time())
    cpu_freq = psutil.cpu_freq()
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")

    lines = [
        "🖥️ **Системная информация**",
        f"• ОС: {uname.system} {uname.release}",
        f"• Имя ПК: {uname.node}",
        f"• Архитектура: {uname.machine}",
        f"• Процессор: {uname.processor or 'N/A'}",
        f"• Ядер (лог.): {psutil.cpu_count(logical=True)}",
        f"• Частота CPU: {cpu_freq.current:.0f} MHz" if cpu_freq else "",
        f"• Загрузка CPU: {psutil.cpu_percent(interval=0.5)}%",
        f"• RAM: {mem.used / (1024**3):.1f} / {mem.total / (1024**3):.1f} GB ({mem.percent}%)",
        f"• Диск /: {disk.used / (1024**3):.1f} / {disk.total / (1024**3):.1f} GB ({disk.percent}%)",
        f"• Время работы с: {boot:%Y-%m-%d %H:%M:%S}",
        f"• IP: {_get_local_ip()}",
    ]
    return "\n".join(l for l in lines if l)


def _get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "N/A"


def list_processes(count: int = 15) -> str:
    procs = []
    for p in psutil.process_iter(["pid", "name", "cpu_percent", "memory_percent"]):
        try:
            info = p.info
            procs.append(info)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    procs.sort(key=lambda x: x.get("cpu_percent") or 0, reverse=True)
    lines = ["📋 **Топ процессов (по CPU):**", ""]
    lines.append(f"{'PID':>7}  {'CPU%':>6}  {'MEM%':>6}  {'Имя'}")
    lines.append("-" * 50)
    for p in procs[:count]:
        lines.append(
            f"{p['pid']:>7}  {(p.get('cpu_percent') or 0):>5.1f}%  "
            f"{(p.get('memory_percent') or 0):>5.1f}%  {p.get('name', '?')}"
        )
    return "\n".join(lines)


def kill_process(pid_or_name: str) -> str:
    try:
        pid = int(pid_or_name)
        proc = psutil.Process(pid)
        name = proc.name()
        proc.terminate()
        return f"✅ Процесс {name} (PID {pid}) завершён."
    except ValueError:
        killed = []
        for proc in psutil.process_iter(["pid", "name"]):
            try:
                if proc.info["name"] and pid_or_name.lower() in proc.info["name"].lower():
                    proc.terminate()
                    killed.append(f"{proc.info['name']} (PID {proc.info['pid']})")
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        if killed:
            return f"✅ Завершены: {', '.join(killed)}"
        return f"❌ Процесс '{pid_or_name}' не найден."
    except psutil.NoSuchProcess:
        return f"❌ Процесс с PID {pid_or_name} не найден."
    except psutil.AccessDenied:
        return f"❌ Нет прав для завершения процесса {pid_or_name}."


def list_directory(path: str = ".") -> str:
    p = Path(path).expanduser().resolve()
    if not p.exists():
        return f"❌ Путь не найден: {p}"
    if not p.is_dir():
        return f"❌ Это не директория: {p}"

    items = sorted(p.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower()))
    lines = [f"📂 **Содержимое {p}:**", ""]
    for item in items[:50]:
        icon = "📁" if item.is_dir() else "📄"
        try:
            size = item.stat().st_size if item.is_file() else 0
            size_str = _human_size(size) if size else ""
        except OSError:
            size_str = ""
        lines.append(f"  {icon} {item.name}  {size_str}")
    if len(items) > 50:
        lines.append(f"  ... и ещё {len(items) - 50} элементов")
    return "\n".join(lines)


def _human_size(size: int) -> str:
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if size < 1024:
            return f"({size:.0f} {unit})"
        size /= 1024
    return f"({size:.0f} PB)"


def read_file(path: str) -> str:
    p = Path(path).expanduser().resolve()
    if not p.exists():
        return f"❌ Файл не найден: {p}"
    if not p.is_file():
        return f"❌ Это не файл: {p}"
    try:
        content = p.read_text(errors="replace")
        if len(content) > 5000:
            content = content[:5000] + "\n\n... (файл обрезан, показано 5000 символов)"
        return f"📄 **{p.name}:**\n```\n{content}\n```"
    except Exception as e:
        return f"❌ Ошибка чтения: {e}"


def write_file(path: str, content: str) -> str:
    p = Path(path).expanduser().resolve()
    try:
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content)
        return f"✅ Файл записан: {p}"
    except Exception as e:
        return f"❌ Ошибка записи: {e}"


def search_files(directory: str, pattern: str) -> str:
    try:
        result = subprocess.run(
            ["find", directory, "-iname", f"*{pattern}*", "-maxdepth", "5"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        files = result.stdout.strip()
        if files:
            return f"🔍 **Найдены файлы с '{pattern}':**\n{files}"
        return f"🔍 Файлы с '{pattern}' не найдены в {directory}"
    except Exception as e:
        return f"❌ Ошибка поиска: {e}"


def open_application(app_name: str) -> str:
    try:
        subprocess.Popen(
            app_name,
            shell=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
        return f"🚀 Запущено: {app_name}"
    except Exception as e:
        return f"❌ Не удалось запустить '{app_name}': {e}"


def get_network_info() -> str:
    addrs = psutil.net_if_addrs()
    stats = psutil.net_if_stats()
    io = psutil.net_io_counters()

    lines = [
        "🌐 **Сетевая информация**",
        f"• Отправлено: {io.bytes_sent / (1024**2):.1f} MB",
        f"• Получено: {io.bytes_recv / (1024**2):.1f} MB",
        "",
        "**Интерфейсы:**",
    ]
    for iface, addr_list in addrs.items():
        is_up = stats.get(iface, None)
        status = "🟢" if is_up and is_up.isup else "🔴"
        for addr in addr_list:
            if addr.family == socket.AF_INET:
                lines.append(f"  {status} {iface}: {addr.address}")
    return "\n".join(lines)


def get_battery_info() -> str:
    battery = psutil.sensors_battery()
    if battery is None:
        return "🔌 Батарея не обнаружена (вероятно настольный ПК)."
    plug = "🔌 Заряжается" if battery.power_plugged else "🔋 От батареи"
    return f"{plug} — {battery.percent}%"


def disk_usage() -> str:
    parts = psutil.disk_partitions()
    lines = ["💾 **Использование дисков:**", ""]
    for part in parts:
        try:
            usage = psutil.disk_usage(part.mountpoint)
            lines.append(
                f"  • {part.device} → {part.mountpoint}: "
                f"{usage.used / (1024**3):.1f}/{usage.total / (1024**3):.1f} GB ({usage.percent}%)"
            )
        except PermissionError:
            continue
    return "\n".join(lines)


def get_datetime() -> str:
    now = datetime.datetime.now()
    return f"🕐 Дата и время: {now:%Y-%m-%d %H:%M:%S} ({now:%A})"


def run_shell_command(cmd: str) -> str:
    for blocked in BLOCKED_PATTERNS:
        if blocked in cmd:
            return f"🚫 Команда заблокирована из соображений безопасности: содержит '{blocked}'"
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=30,
        )
        output = result.stdout.strip()
        err = result.stderr.strip()
        response = ""
        if output:
            response += f"```\n{output[:3000]}\n```"
        if err:
            response += f"\n⚠️ stderr:\n```\n{err[:1000]}\n```"
        if not output and not err:
            response = f"✅ Команда выполнена (код: {result.returncode})"
        return f"⚡ **Результат `{cmd}`:**\n{response}"
    except subprocess.TimeoutExpired:
        return f"⏰ Таймаут: команда '{cmd}' выполнялась дольше 30 секунд."
    except Exception as e:
        return f"❌ Ошибка выполнения: {e}"


def show_help() -> str:
    return """🤖 **Jarvis — Команды:**

**Системные:**
• `системная информация` / `system info` — информация о ПК
• `процессы` / `processes` — список процессов
• `убить <pid/имя>` / `kill <pid/name>` — завершить процесс
• `сеть` / `network` — сетевая информация
• `батарея` / `battery` — состояние батареи
• `диски` / `disks` — использование дисков
• `время` / `time` — текущая дата и время

**Файлы:**
• `файлы <путь>` / `ls <path>` — содержимое директории
• `читать <путь>` / `read <path>` — прочитать файл
• `записать <путь> <текст>` / `write <path> <text>` — записать файл
• `найти <где> <что>` / `find <dir> <pattern>` — поиск файлов

**Приложения:**
• `открой <app>` / `open <app>` — запустить приложение
• `запусти <команда>` / `run <command>` — выполнить shell-команду

**Прочее:**
• `помощь` / `help` — эта справка
• `очистить` / `clear` — очистить историю

💡 Также можно просто писать на естественном языке!"""


# ---------------------------------------------------------------------------
# Command router (built-in NLU)
# ---------------------------------------------------------------------------

COMMAND_MAP = {
    ("помощь", "help", "команды", "commands"): lambda _: show_help(),
    ("системная информация", "system info", "sys info", "инфо", "о системе", "sysinfo"): lambda _: get_system_info(),
    ("процессы", "processes", "top", "htop", "задачи"): lambda _: list_processes(),
    ("сеть", "network", "net", "ip", "интернет"): lambda _: get_network_info(),
    ("батарея", "battery", "заряд"): lambda _: get_battery_info(),
    ("диски", "disks", "disk", "хранилище", "storage"): lambda _: disk_usage(),
    ("время", "time", "дата", "date", "сейчас"): lambda _: get_datetime(),
    ("очистить", "clear", "cls"): lambda _: _clear_history(),
}

PREFIX_COMMANDS = {
    ("убить", "kill", "завершить"): lambda arg: kill_process(arg),
    ("файлы", "ls", "dir", "папка", "директория"): lambda arg: list_directory(arg or "."),
    ("читать", "read", "cat", "показать файл"): lambda arg: read_file(arg) if arg else "❌ Укажите путь к файлу",
    ("найти", "find", "search", "поиск"): lambda arg: _parse_find(arg),
    ("открой", "open", "запустить приложение", "открыть"): lambda arg: open_application(arg) if arg else "❌ Укажите приложение",
    ("запусти", "run", "exec", "выполни", "команда", "cmd", "shell", "терминал"): lambda arg: run_shell_command(arg) if arg else "❌ Укажите команду",
    ("записать", "write"): lambda arg: _parse_write(arg),
}


def _clear_history() -> str:
    conversation_history.clear()
    return "🗑️ История очищена."


def _parse_find(arg: str) -> str:
    parts = arg.split(maxsplit=1) if arg else []
    if len(parts) == 2:
        return search_files(parts[0], parts[1])
    if len(parts) == 1:
        return search_files(".", parts[0])
    return "❌ Использование: найти <директория> <паттерн>"


def _parse_write(arg: str) -> str:
    if not arg:
        return "❌ Использование: записать <путь> <текст>"
    parts = arg.split(maxsplit=1)
    if len(parts) < 2:
        return "❌ Использование: записать <путь> <текст>"
    return write_file(parts[0], parts[1])


def route_command(text: str) -> str | None:
    lower = text.strip().lower()

    for keys, handler in COMMAND_MAP.items():
        if lower in keys:
            return handler(text)

    for keys, handler in PREFIX_COMMANDS.items():
        for key in keys:
            if lower.startswith(key + " ") or lower == key:
                arg = text.strip()[len(key):].strip()
                return handler(arg)

    return None


# ---------------------------------------------------------------------------
# AI-powered processing (optional, uses Groq)
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """Ты — Jarvis, умный ассистент для управления ПК пользователя.
Ты получаешь сообщения от пользователя и должен определить, что он хочет сделать.

У тебя есть следующие функции (вызывай их через JSON):
- {"action": "shell", "command": "<shell command>"} — выполнить команду в терминале
- {"action": "sysinfo"} — показать информацию о системе
- {"action": "processes"} — показать список процессов
- {"action": "kill", "target": "<pid or name>"} — завершить процесс
- {"action": "ls", "path": "<path>"} — показать содержимое папки
- {"action": "read", "path": "<path>"} — прочитать файл
- {"action": "write", "path": "<path>", "content": "<text>"} — записать файл
- {"action": "find", "dir": "<dir>", "pattern": "<pattern>"} — найти файлы
- {"action": "open", "app": "<application>"} — открыть приложение
- {"action": "network"} — показать сетевую информацию
- {"action": "disks"} — показать использование дисков
- {"action": "text", "message": "<text>"} — просто ответить текстом

Отвечай ТОЛЬКО одним JSON объектом. Если пользователь просто общается — используй action "text".
Всегда отвечай на русском языке."""


def process_with_ai(text: str) -> str | None:
    if not GROQ_API_KEY:
        return None

    try:
        from groq import Groq

        client = Groq(api_key=GROQ_API_KEY)

        conversation_history.append({"role": "user", "content": text})
        if len(conversation_history) > 20:
            conversation_history.pop(0)

        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        messages.extend(conversation_history)

        response = client.chat.completions.create(
            model=AI_MODEL,
            messages=messages,
            max_tokens=1024,
            temperature=0.3,
        )

        reply = response.choices[0].message.content.strip()
        conversation_history.append({"role": "assistant", "content": reply})

        return _execute_ai_action(reply)
    except Exception as e:
        return f"❌ Ошибка AI: {e}"


def _execute_ai_action(reply: str) -> str:
    try:
        clean = reply.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
            clean = clean.rsplit("```", 1)[0]

        data = json.loads(clean)
        action = data.get("action", "text")

        action_handlers = {
            "shell": lambda: run_shell_command(data.get("command", "")),
            "sysinfo": lambda: get_system_info(),
            "processes": lambda: list_processes(),
            "kill": lambda: kill_process(str(data.get("target", ""))),
            "ls": lambda: list_directory(data.get("path", ".")),
            "read": lambda: read_file(data.get("path", "")),
            "write": lambda: write_file(data.get("path", ""), data.get("content", "")),
            "find": lambda: search_files(data.get("dir", "."), data.get("pattern", "")),
            "open": lambda: open_application(data.get("app", "")),
            "network": lambda: get_network_info(),
            "disks": lambda: disk_usage(),
            "text": lambda: data.get("message", reply),
        }

        handler = action_handlers.get(action)
        if handler:
            return handler()
        return reply
    except (json.JSONDecodeError, KeyError):
        return reply


# ---------------------------------------------------------------------------
# Process message
# ---------------------------------------------------------------------------

def process_message(text: str) -> str:
    text = text.strip()
    if not text:
        return "❓ Пустое сообщение. Напишите `помощь` для списка команд."

    result = route_command(text)
    if result is not None:
        return result

    ai_result = process_with_ai(text)
    if ai_result is not None:
        return ai_result

    return (
        f"🤔 Не понял команду: **{text}**\n\n"
        "Попробуйте:\n"
        "• `помощь` — список доступных команд\n"
        "• `запусти <команда>` — выполнить shell-команду\n"
        "• Или добавьте GROQ_API_KEY для AI-обработки запросов"
    )


# ---------------------------------------------------------------------------
# Routes & Socket handlers
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return render_template("index.html")


@socketio.on("message")
def handle_message(data):
    text = data.get("text", "")
    emit("typing", {"status": True})
    response = process_message(text)
    emit("typing", {"status": False})
    emit("response", {"text": response})


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    host = os.environ.get("JARVIS_HOST", "0.0.0.0")
    port = int(os.environ.get("JARVIS_PORT", "5000"))
    print(f"\n🤖 Jarvis запущен на http://{host}:{port}\n")
    socketio.run(app, host=host, port=port, debug=False, allow_unsafe_werkzeug=True)


if __name__ == "__main__":
    main()
