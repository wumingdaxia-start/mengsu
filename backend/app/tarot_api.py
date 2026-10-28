"""Local tarot draws, adapted from daman-ovo-0404/tarot-skill (MIT)."""
from typing import Literal
from fastapi import APIRouter
from pydantic import BaseModel, Field
from .tarot_draw import draw_cards

router = APIRouter(prefix='/api/tarot')

class DrawBody(BaseModel):
    spread: Literal['single', 'three', 'diamond', 'moon', 'horseshoe', 'celtic'] = 'three'
    question: str = Field(default='', max_length=300)

@router.post('/draw')
def draw(body: DrawBody):
    result = draw_cards(body.spread, body.question.strip())
    # JavaScript cannot represent the upstream 64-bit seed without precision loss.
    result['seed'] = str(result['seed'])
    return result
