"""fiche worker.

Two jobs the browser shouldn't do:
  POST /normalize  quantities -> grams, using pint for the unit algebra
  POST /compile    typst source -> pdf

Run:  uvicorn main:app --reload --port 8000
"""

from pathlib import Path
import tempfile

import pint
import typst
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from densities import grams_per_cup

ureg = pint.UnitRegistry()
FONTS = Path(__file__).resolve().parent.parent / "public" / "fonts"

app = FastAPI(title="fiche worker")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST"],
    allow_headers=["*"],
)


class Quantity(BaseModel):
    amount: float
    unit: str
    ingredient: str


class Normalized(BaseModel):
    ingredient: str
    grams: float | None
    note: str | None = None


ALIASES = {"tbsp": "tablespoon", "tsp": "teaspoon", "c": "cup", "stick": "stick"}


@app.post("/normalize")
def normalize(items: list[Quantity]) -> list[Normalized]:
    out = []
    for q in items:
        unit = ALIASES.get(q.unit.lower(), q.unit.lower())
        if unit == "stick":
            out.append(Normalized(ingredient=q.ingredient, grams=round(q.amount * 113, 1)))
            continue
        try:
            qty = q.amount * ureg(unit)
        except pint.errors.UndefinedUnitError:
            out.append(Normalized(ingredient=q.ingredient, grams=None, note=f"unknown unit '{q.unit}'"))
            continue

        if qty.check("[mass]"):
            out.append(Normalized(ingredient=q.ingredient, grams=round(qty.to("gram").magnitude, 1)))
        elif qty.check("[volume]"):
            per_cup = grams_per_cup(q.ingredient)
            if per_cup is None:
                out.append(Normalized(ingredient=q.ingredient, grams=None, note="no density on file"))
            else:
                cups = qty.to("cup").magnitude
                out.append(Normalized(ingredient=q.ingredient, grams=round(cups * per_cup, 1)))
        else:
            out.append(Normalized(ingredient=q.ingredient, grams=None, note="not a mass or volume"))
    return out


class Source(BaseModel):
    typst: str


@app.post("/compile")
def compile_pdf(src: Source) -> Response:
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "cookbook.typ"
        path.write_text(src.typst, encoding="utf-8")
        try:
            pdf = typst.compile(str(path), font_paths=[str(FONTS)])
        except Exception as e:  # typst raises a plain RuntimeError with the diagnostics
            raise HTTPException(status_code=422, detail=str(e)) from e
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"content-disposition": 'attachment; filename="cookbook.pdf"'},
    )
