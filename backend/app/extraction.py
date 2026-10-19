from __future__ import annotations

from typing import Any

from .config import Settings
from .llm import chat_json

SYSTEM_PROMPT = """你是睡眠与记忆记录助手的信息抽取模块。

规则：
1. 只抽取用户明确说出的信息。未提到的字段一律为 null，绝不推断。
2. 一晚睡眠归到醒来那一天 sleep_date。跨午夜时以醒来日期为准。
3. 相对时间（昨晚、今天凌晨、刚才、前天）按 now 字段的时间解析，并换算成具体日期。
4. 用户只是聊天、没有可记录事实时，type 用 unknown。
5. 只输出 JSON，不要输出解释文字。

输出格式：
{"items":[{"type":"day_note|sleep|dream_fragment|awakening|unknown",
"date":"YYYY-MM-DD 或 null","payload":{},"confidence":"high|medium|low"}]}

payload 按类型：
day_note: {"text":"当天发生的事","load_valence":"positive|negative|neutral|null",
  "load_intensity":"light|medium|heavy|null"}
sleep: {"bed_at":"YYYY-MM-DDTHH:MM|null","sleep_at":null,"wake_at":null,"rise_at":null,
  "night_wakes":数字或null,"feeling":"主观感受或null","precision":"exact|estimated|unsure"}
dream_fragment: {"text":"梦境原文","emotion":"单一情绪或null",
  "clarity":"clear|vague|mixed|null","tags":[],"people":[],"place":"地点或null"}
awakening: {"text":"夜里醒来时的片段","emotion":null,"count":数字或null}
"""


async def extract_items(
    settings: Settings, text: str, now_iso: str, timezone: str
) -> dict[str, Any]:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"now={now_iso}\ntz={timezone}\n\n用户消息：{text}"},
    ]
    return await chat_json(settings, messages, max_tokens=1400)
