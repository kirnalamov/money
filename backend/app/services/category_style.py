"""
Стиль автоматически создаваемых категорий: цвет и эмодзи.

Раньше все новые категории получали серый #666666 и иконку "help-circle".
Алгоритм хэша цвета совпадает с фронтендом (hashColor в plutus-format.ts),
поэтому категория выглядит одинаково и до, и после сохранения.
"""

import re
from typing import List, Tuple

PALETTE: List[str] = [
    "#A3E635",
    "#38BDF8",
    "#C4B5FD",
    "#FBBF24",
    "#F9A8D4",
    "#5EEAD4",
    "#F87171",
    "#7DD3FC",
    "#6EE7A0",
    "#FDBA74",
]

_RULES: List[Tuple[str, str]] = [
    (r"зарплат|salary|оклад|wage", "💰"),
    (r"подработ|фриланс|side|freelance", "💼"),
    (r"инвест|дивиден|invest|dividend", "📈"),
    (r"продукт|еда|grocer|food|супермаркет", "🛒"),
    (r"кафе|ресторан|бар|coffee|cafe|restaurant", "☕"),
    (r"такси|каршеринг|транспорт|метро|бензин|taxi|transport|fuel|gas", "🚕"),
    (r"жиль|аренда|квартир|ипотек|дом|rent|housing|home|mortgage", "🏠"),
    (r"коммунал|свет|вода|элект|utilit", "💡"),
    (r"покупк|одежд|шоппинг|shopping|cloth", "🛍️"),
    (r"электроник|техник|гаджет|electronic|tech", "📱"),
    (r"здоров|аптек|врач|медицин|health|pharm|doctor", "💊"),
    (r"спорт|фитнес|зал|sport|fitness|gym", "🏋️"),
    (r"развлеч|кино|игр|entertain|movie|game", "🎮"),
    (r"путешеств|отпуск|билет|travel|vacation|flight", "✈️"),
    (r"образован|курс|учеб|educat|course|school", "📚"),
    (r"связь|интернет|телефон|mobile|internet|phone", "📶"),
    (r"подарк|gift", "🎁"),
    (r"питомц|живот|pet", "🐾"),
    (r"красот|салон|beauty", "💅"),
    (r"налог|штраф|tax|fine", "🧾"),
    (r"перевод|transfer", "🔁"),
]
_COMPILED = [(re.compile(p, re.IGNORECASE), e) for p, e in _RULES]
DEFAULT_EMOJI = "🏷️"


def _hash(name: str) -> int:
    h = 0
    for ch in name:
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    return h


def default_category_style(name: str) -> Tuple[str, str]:
    """(цвет, эмодзи) для новой категории по её названию."""
    color = PALETTE[_hash(name) % len(PALETTE)]
    for pattern, emoji in _COMPILED:
        if pattern.search(name):
            return color, emoji
    return color, DEFAULT_EMOJI
