from __future__ import annotations

import uuid

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import db, insight, narrative, service
from .tarot_api import router as tarot_router
from .image_api import router as image_router
from .studio_api import router as studio_router
from .tts_api import router as tts_router
from .config import ATTACHMENT_DIR, AUDIO_DIR, BASE_DIR, ensure_dirs, load_settings
from .memory import MemoryClient, MemoryUnavailable
from .xinchao import XinchaoClient

db.init_db()
ensure_dirs()

app = FastAPI(title="花屿星 API", version="0.1.0")
app.include_router(tarot_router)
app.include_router(image_router)
app.include_router(studio_router)
app.include_router(tts_router)


class InputBody(BaseModel):
    text: str = Field(min_length=1)


class FragmentBody(BaseModel):
    text: str = Field(min_length=1)
    kind: str = "dream"
    day: str | None = None
    emotion: str | None = None
    clarity: str | None = None
    tags: list[str] = Field(default_factory=list)
    people: list[str] = Field(default_factory=list)
    place: str | None = None


class CueBody(BaseModel):
    items: list[str] = Field(default_factory=list)
    day: str | None = None


class CuePlayBody(BaseModel):
    session_id: int


class CueReviewBody(BaseModel):
    session_id: int
    appeared: str = "unsure"
    note: str | None = None
    day: str | None = None


class NarrativeBody(BaseModel):
    start: str
    end: str
    kind: str = "weekly"


class RecallBody(BaseModel):
    query: str = Field(min_length=1)
    max_results: int = 5


class RememberBody(BaseModel):
    content: str = Field(min_length=1)
    tags: str = ""
    importance: int = 5


class DreamBody(BaseModel):
    text: str = ""
    kind: str = "dream"
    day: str | None = None
    emotion: str | None = None
    clarity_score: int | None = None
    tags: list[str] = Field(default_factory=list)
    people: list[str] = Field(default_factory=list)
    place: str | None = None
    photo_path: str | None = None
    draft: bool = False


class AskBody(BaseModel):
    question: str = Field(min_length=1)


class ExportBody(BaseModel):
    start: str
    end: str


@app.get("/api/health")
def health() -> dict[str, object]:
    settings = load_settings()
    return {
        "status": "ok",
        "provider": "qwen",
        "model": settings.chat_model,
        "llm_ready": settings.llm_ready,
        "xinchao_ready": settings.xinchao_ready,
        "memory_ready": settings.memory_ready,
        "timezone": settings.timezone,
    }


@app.get("/api/home")
def get_home() -> dict[str, object]:
    return insight.home()


@app.get("/api/fragments")
def get_fragments(
    start: str | None = None,
    end: str | None = None,
    emotion: str | None = None,
    tag: str | None = None,
    person: str | None = None,
    place: str | None = None,
    kind: str | None = None,
    query: str | None = None,
    limit: int = Query(default=200, le=500),
) -> list[dict[str, object]]:
    return insight.list_fragments(
        start=start,
        end=end,
        emotion=emotion,
        tag=tag,
        person=person,
        place=place,
        kind=kind,
        query=query,
        limit=limit,
    )


@app.get("/api/fragments/{fragment_id}")
def get_fragment(fragment_id: int) -> dict[str, object]:
    row = insight.get_fragment(fragment_id)
    if row is None:
        raise HTTPException(status_code=404, detail="记录不存在")
    return row


@app.delete("/api/fragments/{fragment_id}")
def remove_fragment(fragment_id: int) -> dict[str, object]:
    if not insight.delete_fragment(fragment_id):
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"ok": True, "id": fragment_id}


@app.post("/api/fragments")
def create_fragment(body: DreamBody) -> dict[str, object]:
    day = body.day or service.today_iso()
    fragment_id = db.insert(
        "fragments",
        {
            "fragment_date": day,
            "happened_at": None,
            "kind": body.kind,
            "text": body.text.strip(),
            "emotion": body.emotion,
            "clarity": None,
            "clarity_score": body.clarity_score,
            "tags": db.dumps(body.tags),
            "people": db.dumps(body.people),
            "place": body.place,
            "photo_path": body.photo_path,
            "draft": 1 if body.draft else 0,
            "message_id": None,
            "created_at": db.now_iso(),
        },
    )
    return {"id": fragment_id, "date": day, "draft": body.draft}


@app.post("/api/fragments/photo")
async def upload_photo(file: UploadFile = File(...)) -> dict[str, object]:
    suffix = (file.filename or "").rsplit(".", 1)
    extension = suffix[1].lower() if len(suffix) == 2 else "jpg"
    if extension not in {"jpg", "jpeg", "png", "webp", "gif"}:
        raise HTTPException(status_code=400, detail="只支持 jpg / png / webp / gif")
    payload = await file.read()
    if len(payload) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="图片不能超过 10 MB")
    name = f"{uuid.uuid4().hex}.{extension}"
    (ATTACHMENT_DIR / name).write_bytes(payload)
    return {"name": name, "url": f"/media/{name}"}


@app.get("/api/dreams/stats")
def dream_stats() -> dict[str, object]:
    return insight.stats()


@app.get("/api/dreams/search")
def dream_search(query: str) -> list[dict[str, object]]:
    return insight.search(query)


@app.get("/api/dreams/insight")
def dream_insight(start: str | None = None, end: str | None = None) -> dict[str, object]:
    return insight.insight(start, end)


@app.get("/api/dreams/dna")
def dream_dna(start: str | None = None, end: str | None = None) -> dict[str, object]:
    return insight.dna(start, end)


@app.get("/api/dreams/network")
def dream_network(limit: int = Query(default=40, le=200)) -> dict[str, object]:
    return insight.network(limit)


@app.get("/api/dreams/day-title")
def dream_day_title(day: str) -> dict[str, object]:
    return {"day": day, "title": insight.day_title(day)}


@app.get("/api/dreams/palette")
def dream_palette() -> list[dict[str, object]]:
    return insight.mood_palette()


@app.get("/api/dreams/map")
def dream_map() -> dict[str, object]:
    return insight.dream_map()


@app.get("/api/models")
def list_models() -> list[dict[str, object]]:
    settings = load_settings()
    return [
        {"id": "qwen", "name": "千问", "ready": settings.llm_ready},
    ]


@app.post("/api/dreams/ask")
async def dream_ask(body: AskBody) -> dict[str, object]:
    return await insight.ask(body.question)


@app.post("/api/dreams/export")
def dream_export(body: ExportBody) -> dict[str, object]:
    return insight.export_markdown(body.start, body.end)


@app.get("/api/memory/tools")
async def memory_tools() -> dict[str, object]:
    settings = load_settings()
    if not settings.memory_ready:
        return {"connected": False, "reason": "未配置记忆服务令牌"}
    try:
        tools = await MemoryClient(settings).list_tools()
    except Exception as exc:
        return {"connected": False, "reason": f"记忆服务没有响应：{exc}"}
    return {"connected": True, "tools": tools}


@app.post("/api/memory/recall")
async def memory_recall(body: RecallBody) -> dict[str, object]:
    settings = load_settings()
    try:
        text = await MemoryClient(settings).recall(body.query, body.max_results)
    except MemoryUnavailable as exc:
        return {"ok": False, "reason": str(exc)}
    except Exception as exc:
        return {"ok": False, "reason": f"召回失败：{exc}"}
    return {"ok": True, "text": text}


@app.post("/api/memory/remember")
async def memory_remember(body: RememberBody) -> dict[str, object]:
    settings = load_settings()
    try:
        text = await MemoryClient(settings).remember(body.content, body.tags, body.importance)
    except MemoryUnavailable as exc:
        return {"ok": False, "reason": str(exc)}
    except Exception as exc:
        return {"ok": False, "reason": f"写入失败：{exc}"}
    return {"ok": True, "text": text}


@app.get("/api/companion/now")
async def companion_now() -> dict[str, object]:
    settings = load_settings()
    if not settings.xinchao_ready:
        return {"connected": False, "reason": "未配置心潮令牌"}
    data = await XinchaoClient(settings).now()
    if data is None:
        return {"connected": False, "reason": "心潮服务没有响应"}
    return {"connected": True, "now": data}


@app.get("/api/companion/state")
async def companion_state() -> dict[str, object]:
    settings = load_settings()
    if not settings.xinchao_ready:
        return {"connected": False, "reason": "未配置心潮令牌"}
    data = await XinchaoClient(settings).state()
    if data is None:
        return {"connected": False, "reason": "心潮服务没有响应"}
    return {"connected": True, "state": data}


@app.post("/api/input")
async def post_input(body: InputBody) -> dict[str, object]:
    return await service.handle_input(body.text)


@app.get("/api/day/{day}")
def get_day(day: str) -> dict[str, object]:
    return service.day_view(day)


@app.get("/api/pending")
def get_pending() -> list[dict[str, object]]:
    return service.pending_notes()


@app.get("/api/timeline")
def get_timeline(start: str, end: str) -> list[dict[str, object]]:
    return service.timeline(start, end)


@app.post("/api/fragment")
def post_fragment(body: FragmentBody) -> dict[str, object]:
    day = body.day or service.today_iso()
    fragment_id = db.insert(
        "fragments",
        {
            "fragment_date": day,
            "happened_at": None,
            "kind": body.kind,
            "text": body.text,
            "emotion": body.emotion,
            "clarity": body.clarity,
            "tags": db.dumps(body.tags),
            "people": db.dumps(body.people),
            "place": body.place,
            "message_id": None,
            "created_at": db.now_iso(),
        },
    )
    return {"id": fragment_id, "date": day, "kind": body.kind}


@app.post("/api/cue")
def post_cue(body: CueBody) -> dict[str, object]:
    if not body.items:
        raise HTTPException(status_code=400, detail="线索不能为空")
    return service.create_cue_session(body.day or service.today_iso(), body.items)


@app.post("/api/cue/played")
def post_cue_played(body: CuePlayBody) -> dict[str, object]:
    service.mark_cue_played(body.session_id)
    return {"id": body.session_id, "played": True}


@app.post("/api/cue/review")
def post_cue_review(body: CueReviewBody) -> dict[str, object]:
    return service.review_cue(
        body.session_id,
        body.day or service.today_iso(),
        body.appeared,
        body.note,
    )


@app.post("/api/cue/{session_id}/audio")
def post_cue_audio(session_id: int) -> dict[str, object]:
    result = service.build_audio_for(session_id)
    if result is None:
        raise HTTPException(status_code=404, detail="线索会话不存在")
    return result


@app.post("/api/narrative")
async def post_narrative(body: NarrativeBody) -> dict[str, object]:
    return await narrative.generate(body.start, body.end, body.kind)


@app.get("/api/narrative/latest")
def get_latest_narrative() -> dict[str, object]:
    row = narrative.latest()
    if row is None:
        raise HTTPException(status_code=404, detail="还没有生成过叙事报告")
    return row


app.mount("/audio", StaticFiles(directory=AUDIO_DIR), name="audio")
app.mount("/media", StaticFiles(directory=ATTACHMENT_DIR), name="media")

FRONTEND_DIST = BASE_DIR / "frontend" / "dist"

if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str) -> FileResponse:
        """前端用的是多页路由，刷新 /dreams 这类地址时也要能拿到 index.html。"""
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        if "." in full_path.rsplit("/", 1)[-1]:
            raise HTTPException(status_code=404, detail="找不到这个文件")
        return FileResponse(FRONTEND_DIST / "index.html")
