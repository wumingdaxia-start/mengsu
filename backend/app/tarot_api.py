"""花屿星星栈映照网页接口。"""
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
    return draw_cards(body.spread, body.question.strip())
