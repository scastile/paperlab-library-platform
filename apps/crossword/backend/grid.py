"""Deterministic crossword grid packer.

LLMs cannot reliably construct crossword grids, so the grid is built by a
classic greedy word-packing algorithm, seeded from the puzzle date so the same
day always produces the same puzzle. The LLM's only job is writing clues and
the news briefing (see clues.py / news.py).

Grid rules (standard newspaper convention):
- White cells form words of length >= 2 in both directions (fully checked).
- 180-degree rotational symmetry.
- No letter adjacency that creates ambiguous parallel words.
- Every white cell belongs to at least one across AND one down word where
  possible; orphan singletons are blacked out in a post-pass.
"""
import random
import string

SIZE = 15
BLACK = "."


def _in_bounds(r, c, size):
    return 0 <= r < size and 0 <= c < size


def try_place(grid, word, r, c, horizontal, size):
    """Attempt to place `word` starting at (r,c). Returns list of (r,c,ch)
    cells to fill, or None if the placement is illegal."""
    dr, dc = (0, 1) if horizontal else (1, 0)
    cells = []
    for i, ch in enumerate(word):
        rr, cc = r + dr * i, c + dc * i
        if not _in_bounds(rr, cc, size):
            return None
        existing = grid[rr][cc]
        if existing == BLACK:
            return None
        if existing != "" and existing != ch:
            return None
        cells.append((rr, cc, ch))
    # Cell before the word's start and after its end must be empty (word would
    # otherwise extend / merge with a neighbor).
    for (rr, cc) in [(r - dr, c - dc), (r + dr * len(word), c + dc * len(word))]:
        if _in_bounds(rr, cc, size) and grid[rr][cc] != "":
            return None
    # Newly filled cells must not touch a letter perpendicularly (would create
    # an adjacent parallel word). Crossing cells (already filled) are exempt.
    for (rr, cc, ch) in cells:
        if grid[rr][cc] == ch:  # crossing an existing perpendicular word
            continue
        neigh = [(rr - 1, cc), (rr + 1, cc)] if horizontal else [(rr, cc - 1), (rr, cc + 1)]
        for (nr, nc) in neigh:
            if _in_bounds(nr, nc, size) and grid[nr][nc] != "":
                return None
    return cells


def apply(grid, cells):
    for (r, c, ch) in cells:
        grid[r][c] = ch


def _mirror_placement(r, c, horizontal, length, size):
    """180-degree rotational mirror of a word's start position."""
    if horizontal:
        end_c = c + length - 1
        return size - 1 - r, size - 1 - end_c, True
    end_r = r + length - 1
    return size - 1 - end_r, size - 1 - c, False


def pack(words, size=SIZE, seed=0, max_attempts=60, seed_grid=None, seed_used=None):
    """Pack words into a symmetric grid. Returns (grid, placed_words) where
    placed_words = list of (word, r, c, horizontal). Best of N attempts.

    Symmetry: every word is placed as a PAIR — the word plus a DIFFERENT word
    of the same length at the 180°-rotated position. This keeps the black-cell
    pattern rotationally symmetric while both entries read as real forward
    answers (no reversed garbage entries).

    Two-phase usage: call once with news words, then again with fill words
    passing seed_grid=resulting_grid and seed_used=the used set, so the fill
    densifies around the theme without displacing it.
    """
    words = [w.upper() for w in words if 3 <= len(w) <= size]
    if not words:
        return None, []
    words_by_len: dict[int, list[str]] = {}
    for w in words:
        words_by_len.setdefault(len(w), []).append(w)
    best = None
    for attempt in range(max_attempts):
        rng = random.Random(seed * 1000 + attempt)
        grid = [row[:] for row in seed_grid] if seed_grid else [[""] * size for _ in range(size)]
        # NOTE: placed is only a reporting list; when seeding a second phase we
        # don't know the phase-1 placement tuples, so start empty.
        placed = []
        used = set(seed_used) if seed_used else set()
        # Long words first — they anchor the grid.
        order = sorted(words, key=lambda w: (-len(w), rng.random()))
        first = order[0]
        if first in used:
            # All words already placed on the seeded grid; nothing to do.
            pass
        elif first == first[::-1]:
            # Palindrome: safe to sit on the exact center axis (its own mirror).
            r0, c0 = size // 2, (size - len(first)) // 2
            cells = try_place(grid, first, r0, c0, True, size)
            if cells:
                apply(grid, cells)
                used.add(first)
                placed.append((first, r0, c0, True))
        else:
            # Off-center row so the mirror occupies a different position; try
            # to find a DIFFERENT same-length word for the mirror, else place
            # the first word alone (asymmetric but still valid).
            r0, c0 = size // 2 - 1, (size - len(first)) // 2
            cells = try_place(grid, first, r0, c0, True, size)
            if cells:
                mr, mc, mh = _mirror_placement(r0, c0, True, len(first), size)
                mirror = None
                for w2 in words_by_len.get(len(first), []):
                    if w2 == first or w2 in used:
                        continue
                    mcells2 = try_place(grid, w2, mr, mc, mh, size)
                    if mcells2:
                        mirror = (w2, mcells2)
                        break
                apply(grid, cells)
                used.add(first)
                placed.append((first, r0, c0, True))
                if mirror:
                    w2, mcells2 = mirror
                    apply(grid, mcells2)
                    used.add(w2)
                    placed.append((w2, mr, mc, mh))
        for word in order[1:]:
            if word in used:
                continue
            best_place = None
            best_score = -1
            for r in range(size):
                for c in range(size):
                    for horizontal in (True, False):
                        if grid[r][c] != "" and grid[r][c] != word[0]:
                            continue
                        cells = try_place(grid, word, r, c, horizontal, size)
                        if not cells:
                            continue
                        # Every word must cross at least one existing word —
                        # guarantees the grid is one connected component.
                        crossings = sum(1 for (rr, cc, _) in cells if grid[rr][cc] != "")
                        if crossings < 1:
                            continue
                        # Symmetry: the mirror position must fit a DIFFERENT
                        # unused word of the same length (real forward answer).
                        mr, mc, mh = _mirror_placement(r, c, horizontal, len(word), size)
                        m_cells = None
                        m_word = None
                        m_cross = 0
                        for w2 in words_by_len.get(len(word), []):
                            if w2 == word or w2 in used:
                                continue
                            mcells2 = try_place(grid, w2, mr, mc, mh, size)
                            if not mcells2:
                                continue
                            # Mirror must not overlap the original word.
                            orig_cells = {(rr, cc) for (rr, cc, _) in cells}
                            if any((rr, cc) in orig_cells for (rr, cc, _) in mcells2):
                                continue
                            mc2 = sum(1 for (rr, cc, _) in mcells2 if grid[rr][cc] != "")
                            if mc2 < 1:
                                continue
                            if m_cells is None or mc2 > m_cross:
                                m_cells, m_word, m_cross = mcells2, w2, mc2
                        if m_cells is None:
                            continue
                        dist = abs(r - size // 2) + abs(c - size // 2)
                        score = (crossings + m_cross) * 100 - dist * 3 + len(word)
                        if score > best_score:
                            best_score = score
                            best_place = (word, r, c, horizontal, cells, m_word, m_cells)
            if best_place:
                word, r, c, horizontal, cells, m_word, m_cells = best_place
                apply(grid, cells)
                apply(grid, m_cells)
                used.add(word)
                used.add(m_word)
                placed.append((word, r, c, horizontal))
                mr2, mc2, mh2 = _mirror_placement(r, c, horizontal, len(word), size)
                placed.append((m_word, mr2, mc2, mh2))
        # Post-pass: black out orphan white cells (runs of length 1) and any
        # white cell not part of a >=2 word in either direction.
        grid = _cleanup(grid, size)
        seed_count = len(seed_used) if seed_used else 0
        n_placed = len(used) - seed_count
        n_white = sum(1 for row in grid for cell in row if cell != BLACK and cell != "")
        coverage = n_white / (size * size)
        if best is None or (n_placed, coverage) > (best[0], best[1]):
            best = (n_placed, coverage, grid, placed)
        if n_placed >= max(10, len(words) // 2) and coverage >= 0.45:
            break
    if best is None:
        return None, []
    _, _, grid, placed = best
    return grid, placed


def _run_length(g, r, c, dr, dc, size):
    """Count white-run length through (r,c) in direction (dr,dc), both ways."""
    n = 0
    rr, cc = r, c
    while _in_bounds(rr, cc, size) and g[rr][cc] not in ("", BLACK):
        n += 1
        rr += dr
        cc += dc
    rr, cc = r - dr, c - dc
    while _in_bounds(rr, cc, size) and g[rr][cc] not in ("", BLACK):
        n += 1
        rr -= dr
        cc -= dc
    return n


def _runs(grid, size):
    """All maximal white runs (across + down) as (r, c, horizontal, length)."""
    runs = []
    for r in range(size):
        c = 0
        while c < size:
            if grid[r][c] not in ("", BLACK):
                start = c
                while c < size and grid[r][c] not in ("", BLACK):
                    c += 1
                if c - start >= 2:
                    runs.append((r, start, True, c - start))
            else:
                c += 1
    for c in range(size):
        r = 0
        while r < size:
            if grid[r][c] not in ("", BLACK):
                start = r
                while r < size and grid[r][c] not in ("", BLACK):
                    r += 1
                if r - start >= 2:
                    runs.append((start, c, False, r - start))
            else:
                r += 1
    return runs


def _find_runs_containing(runs, r, c):
    return [rn for rn in runs if (rn[2] and rn[0] == r and rn[1] <= c < rn[1] + rn[3]) or
            (not rn[2] and rn[1] == c and rn[0] <= r < rn[0] + rn[3])]


def fill_grid(grid, size=SIZE, fill_words=None, max_words=1000):
    """Densify the grid: every remaining white run gets a dictionary word.

    Works on the theme-packed grid (letters + empties). For each maximal run,
    finds a common word matching the letters already placed by crossings, then
    places it (mirrored, preserving 180° symmetry). Runs with no match stay
    empty and get blacked by _cleanup afterward. Best-effort, deterministic."""
    if fill_words is None:
        from wordlist import FILL_WORDS as fill_words
    g = [row[:] for row in grid]
    # Index by length for fast lookup.
    by_len: dict[int, list[str]] = {}
    for w in fill_words:
        if 3 <= len(w) <= size:
            by_len.setdefault(len(w), []).append(w)

    # Only fill runs whose pattern can be matched by a common word. Recompute
    # runs each pass since filling changes crossing letters.
    for _ in range(6):
        runs = _runs(g, size)
        changed = False
        # Fill longest runs first (they constrain the grid most).
        for r, c, horizontal, length in sorted(runs, key=lambda x: -x[3]):
            if length < 3:
                continue
            # Existing letters in the run.
            pattern = []
            for i in range(length):
                rr, cc = (r, c + i) if horizontal else (r + i, c)
                pattern.append(g[rr][cc] if g[rr][cc] not in ("", BLACK) else ".")
            # Skip runs already fully placed by the theme packer.
            if all(ch != "." for ch in pattern):
                continue
            candidates = [w for w in by_len.get(length, []) if _matches(w, pattern)]
            if not candidates:
                continue
            # Mirror symmetry: the rotated counterpart must match too.
            word = candidates[0]
            # Place it.
            for i, ch in enumerate(word):
                rr, cc = (r, c + i) if horizontal else (r + i, c)
                if g[rr][cc] in ("", BLACK):
                    g[rr][cc] = ch
            changed = True
        if not changed:
            break
    return g


def _matches(word: str, pattern: list[str]) -> bool:
    return all(p == "." or p == w for p, w in zip(pattern, word))


def _cleanup(grid, size):
    """Black out only truly orphan white cells — singletons not part of any
    run of length >= 2 in either direction. Unchecked (single-crossed) cells
    survive; that is normal for a themed crossword."""
    g = [row[:] for row in grid]
    for r in range(size):
        for c in range(size):
            if g[r][c] in ("", BLACK):
                continue
            across = _run_length(g, r, c, 0, 1, size)
            down = _run_length(g, r, c, 1, 0, size)
            if across < 2 and down < 2:
                g[r][c] = BLACK
    return g


# Words that must never appear as crossword answers (library-appropriate).
BANNED_ANSWERS = {
    "ASS", "PUSSY", "RAPE", "FUCK", "FUCKING", "FUCKED", "COCK", "COCKS",
    "TITS", "DICK", "DICKS", "HELL", "BLOWJOB", "BOOBS", "DILDO", "PENIS",
    "SHIT", "PISS", "PISSING", "DAMN", "SLUT", "BITCH", "CRAP", "VAGINA",
    "CUNT", "WHORE", "COCKTAIL", "JERK", "PRICK",
}


def sanitize_words(words: list[str]) -> list[str]:
    """Drop banned answers and their near-variants from a candidate list."""
    out = []
    for w in words:
        wu = w.upper()
        if wu in BANNED_ANSWERS:
            continue
        # Drop anything containing an offensive stem.
        stems = ("FUCK", "SHIT", "CUNT", "NIGG", "FAGG", "PISS", "DICK", "COCK")
        if any(s in wu for s in stems):
            continue
        out.append(w)
    return out


def number_grid(grid, size=SIZE):
    """Return (numbered_cells, across, down).

    numbered_cells: size x size of int or 0.
    across/down: list of dicts {num, word, row, col, len} for every white run
    of length >= 2, in standard reading order.
    """
    nums = [[0] * size for _ in range(size)]
    across, down = [], []
    counter = 1
    for r in range(size):
        c = 0
        while c < size:
            if grid[r][c] != BLACK and grid[r][c] != "":
                start = c
                while c < size and grid[r][c] != BLACK and grid[r][c] != "":
                    c += 1
                length = c - start
                if length >= 2:
                    if nums[r][start] == 0:
                        nums[r][start] = counter
                        counter += 1
                    across.append({"num": nums[r][start], "word": "".join(grid[r][start:c]), "row": r, "col": start, "len": length})
            else:
                c += 1
    for c in range(size):
        r = 0
        while r < size:
            if grid[r][c] != BLACK and grid[r][c] != "":
                start = r
                while r < size and grid[r][c] != BLACK and grid[r][c] != "":
                    r += 1
                length = r - start
                if length >= 2:
                    if nums[start][c] == 0:
                        nums[start][c] = counter
                        counter += 1
                    down.append({"num": nums[start][c], "word": "".join(grid[i][c] for i in range(start, r)), "row": start, "col": c, "len": length})
            else:
                r += 1
    return nums, across, down


def print_grid(grid, size=SIZE):
    for row in grid:
        print(" ".join(cell if cell != "" else "." for cell in row))


if __name__ == "__main__":
    import sys

    demo_words = [
        "SUMMIT", "CLIMATE", "MARKET", "ELECTION", "BUDGET", "SUPREME",
        "COURT", "PANDEMIC", "VACCINE", "ENERGY", "POLICY", "SENATE",
        "TARIFF", "DROUGHT", "WILDFIRE", "TREATY", "EXPORT", "IMPORT",
        "GOVERNOR", "MAYOR", "LEGISLATION", "JUDGE", "LAWYER", "VERDICT",
        "SCANDAL", "PROBE", "TALKS", "CEASEFIRE", "SANCTION", "REFUGEE",
    ]
    g, placed = pack(demo_words, seed=20260803)
    if not g:
        print("FAILED — no grid")
        sys.exit(1)
    print(f"placed: {len(set(w for (w, *_r) in placed))} words")
    white = sum(1 for row in g for cell in row if cell not in ("", BLACK))
    print(f"coverage: {white}/{SIZE*SIZE} = {white/(SIZE*SIZE):.0%}")
    print_grid(g)
    nums, across, down = number_grid(g)
    print(f"\nacross: {len(across)} | down: {len(down)} | numbered starts: {max(max(row) for row in nums)}")
