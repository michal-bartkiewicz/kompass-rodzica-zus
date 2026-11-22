#!/usr/bin/env python3
"""Render the Polish Kompas Rodzica ZUS presentation film locally."""

from __future__ import annotations

import base64
import ctypes
import ctypes.util
import math
import os
import tempfile
import textwrap
import wave
from pathlib import Path

import gi
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps

gi.require_version("Gst", "1.0")
from gi.repository import Gst  # noqa: E402


Gst.init(None)
ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parent
SHOTS = ROOT / "screenshots"
INTRO = ROOT / "assets" / "intro-veo.mp4"
OUTPUT = ROOT / "filmik-prezentacyjny.mp4"
VISUAL_OUTPUT = ROOT / "filmik-wizualny.mp4"
FPS = 24
WIDTH = 1280
HEIGHT = 720
TOTAL_SECONDS = 145
TOTAL_FRAMES = TOTAL_SECONDS * FPS
SAMPLE_RATE = 22050
SCENE_DURATIONS = [8, 15, 22, 22, 21, 10, 14, 17, 16]

INK = "#122A32"
GREEN = "#087944"
MINT = "#EAF5ED"
CREAM = "#FFFDF7"
MUTED = "#506761"
WHITE = "#FFFFFF"

FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

SCENES = [
    {
        "title": "Spokojny plan dla rodziny",
        "label": "WPROWADZENIE",
        "duration": 8,
        "narration": "Po narodzinach mojego dziecka formalności przytłaczały mnie. Kompas Rodzica ZUS pomógł mi spokojnie ułożyć plan.",
        "intro": True,
    },
    {
        "title": "Zacznij od przypadku",
        "label": "01 · SYMULACJA LOGOWANIA",
        "duration": 15,
        "narration": "Zaczęłam od fikcyjnego przypadku, żeby przejść wszystko bez stresu. To symulacja logowania: bez hasła, bez kodu i bez łączenia z e-ZUS. Mogłam też wpisać własne dane.",
        "copy": "Wybierz syntetyczny profil lub wpisz dane ręcznie.",
        "bullets": ["Bez hasła i kodu", "Bez połączenia z e-ZUS"],
        "phases": [
            {"image": "01-start.jpg", "seconds": 5, "focus": 0.5},
            {"image": "02-logowanie-ezus.jpg", "seconds": 10, "focus": 0.5},
        ],
    },
    {
        "title": "Porównaj warianty",
        "label": "02 · KALKULATOR",
        "duration": 22,
        "narration": "Najbardziej pomógł mi kalkulator. Wpisałam formę zatrudnienia, termin porodu i podział opieki. Od razu zobaczyłam warianty wypłaty, kwoty dla nas obojga i ważne terminy. Wynik oblicza silnik reguł, więc mogłam łatwo porównać założenia.",
        "copy": "Kwoty i terminy w jednym planie dla obojga rodziców.",
        "bullets": ["81,5% lub 100% + 70%", "Wynik liczy silnik reguł"],
        "phases": [{"image": "03-kalkulator.jpg", "seconds": 22, "focus": 0.52}],
    },
    {
        "title": "Zobacz ważne wyjątki",
        "label": "03 · SCENARIUSZE",
        "duration": 22,
        "narration": "Doceniłam też, że Kompas Rodzica ZUS pokazuje ważne wyjątki. W przykładzie z umową zlecenia bez dobrowolnego ubezpieczenia chorobowego wyjaśnia, dlaczego nie przysługuje zasiłek chorobowy z tego ubezpieczenia. Scenariusz działalności przypomina o dziewięćdziesięciu dniach wyczekiwania na zasiłek chorobowy.",
        "copy": "Rodzaj umowy i ubezpieczenie mogą zmienić wynik.",
        "bullets": ["Z-3a · bez dobrowolnego chorobowego", "B2B · 90 dni wyczekiwania"],
        "phases": [{"image": "03-kalkulator.jpg", "seconds": 22, "focus": 0.78}],
    },
    {
        "title": "Sprawdź dokument",
        "label": "04 · AUDYT PDF",
        "duration": 21,
        "narration": "Doceniam, że po wgraniu dokumentu Kompas Rodzica ZUS pokazuje mi, co wymaga uwagi i dlaczego. Mogę otworzyć uzasadnienie i podstawę prawną. W prezentacji korzystamy wyłącznie z dokumentów testowych.",
        "copy": "Najpierw wgraj plik albo wybierz syntetyczny PDF pod polem wgrywania.",
        "bullets": ["Wynik pojawia się po analizie", "Widać uzasadnienie i podstawę"],
        "phases": [{"image": "04-audytor-pdf.jpg", "seconds": 21, "focus": 0.48}],
    },
    {
        "title": "Przejdź do kolejnego kroku",
        "label": "05 · SYMULATOR eZUS",
        "duration": 10,
        "narration": "Zobaczyłam, jak wygląda historia e-ZLA i dalsza ścieżka. Dane są fikcyjne; ekran nie łączy się z ZUS.",
        "copy": "Podgląd przykładowych spraw i dalszych działań.",
        "bullets": ["Konto testowe", "Przykładowa ścieżka USC"],
        "phases": [{"image": "05-symulator-ezus.jpg", "seconds": 10, "focus": 0.46}],
    },
    {
        "title": "Wygeneruj projekt wniosku",
        "label": "06 · KREATOR DOKUMENTÓW",
        "duration": 14,
        "narration": "Gdy potrzebowałam formularza, generator przygotował projekt PDF. Wybrałam ZAM, ZAS-53 albo druk dla pracodawcy, sprawdziłam pola i pobrałam dokument. To projekt testowy, nie oficjalny druk.",
        "copy": "Wybierz rodzaj dokumentu, sprawdź wypełnione pola i pobierz projekt PDF.",
        "bullets": ["ZAM · ZAS-53 · druki pracodawcy", "Projekt testowy, nie oficjalny druk"],
        "phases": [{"image": "08-generator-wnioskow.jpg", "seconds": 14, "focus": 0.5}],
    },
    {
        "title": "Prawo prostym językiem",
        "label": "07 · ASYSTENT PRAWA",
        "duration": 17,
        "narration": "Gdy pojawiły się pytania o przepisy, asystent wyjaśnił je prostym językiem i pokazał podstawę prawną. Odpowiedzi AI sprawdzam w źródłach, bo mogą się mylić. Kwoty oblicza silnik reguł.",
        "copy": "Odpowiedź prowadzi do podstawy prawnej.",
        "bullets": ["AI może się mylić", "Kwoty oblicza silnik reguł"],
        "phases": [{"image": "06-asystent-prawa.jpg", "seconds": 17, "focus": 0.49}],
    },
    {
        "title": "Oblicz · Sprawdź · Zaplanuj",
        "label": "KOMPAS RODZICA ZUS",
        "duration": 16,
        "narration": "Kompas Rodzica ZUS dał mi poczucie, że wiem, co sprawdzić i jaki zrobić następny krok. Jeśli chcesz spokojniej zaplanować sprawy po narodzinach dziecka, polecam go. Przed wnioskiem zweryfikuj wymagania ZUS.",
        "outro": True,
    },
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    path = FONT_BOLD if bold else FONT_REGULAR
    return ImageFont.truetype(path, size)


def wrapped(text: str, width: int) -> str:
    return "\n".join(textwrap.wrap(text, width=width, break_long_words=False))


def draw_compass(draw: ImageDraw.ImageDraw, x: int, y: int, scale: int = 1) -> None:
    radius = 14 * scale
    draw.ellipse((x, y, x + 2 * radius, y + 2 * radius), outline=GREEN, width=2 * scale)
    draw.line((x + radius, y + 4 * scale, x + radius, y + 2 * radius - 4 * scale), fill=GREEN, width=2 * scale)
    draw.line((x + 4 * scale, y + radius, x + 2 * radius - 4 * scale, y + radius), fill=GREEN, width=2 * scale)
    draw.polygon([(x + radius, y + 5 * scale), (x + radius - 4 * scale, y + radius + 2 * scale), (x + radius + 3 * scale, y + radius - 2 * scale)], fill=GREEN)


def gradient_background() -> Image.Image:
    top = np.array([247, 251, 246], dtype=np.float32)
    bottom = np.array([255, 253, 247], dtype=np.float32)
    values = np.linspace(0, 1, HEIGHT, dtype=np.float32)[:, None]
    rows = ((1 - values) * top + values * bottom).astype(np.uint8)
    pixels = np.repeat(rows[:, None, :], WIDTH, axis=1)
    image = Image.fromarray(pixels, "RGB")
    d = ImageDraw.Draw(image)
    d.ellipse((1000, -170, 1390, 220), fill="#EFF8F1")
    d.ellipse((-150, 400, 140, 690), fill="#F2F8F1")
    return image


def base_slide(scene: dict, page: int) -> Image.Image:
    image = gradient_background()
    draw = ImageDraw.Draw(image)
    draw_compass(draw, 58, 38)
    draw.text((96, 41), "KOMPAS RODZICA ZUS", font=font(15, True), fill=GREEN)
    draw.text((1130, 43), f"{page:02d} / 09", font=font(14, True), fill=MUTED)
    draw.text((62, 112), scene["label"].upper(), font=font(14, True), fill=GREEN)
    title = wrapped(scene["title"], 15)
    draw.multiline_text((60, 150), title, font=font(39, True), fill=INK, spacing=7)
    title_height = draw.multiline_textbbox((60, 150), title, font=font(39, True), spacing=7)[3] - 150
    copy_y = 165 + title_height
    copy = wrapped(scene.get("copy", ""), 34)
    if copy:
        draw.multiline_text((64, copy_y + 8), copy, font=font(18), fill=MUTED, spacing=7)
        copy_height = draw.multiline_textbbox((64, copy_y + 8), copy, font=font(18), spacing=7)[3] - (copy_y + 8)
    else:
        copy_height = 0
    bullet_y = copy_y + copy_height + 26
    for bullet in scene.get("bullets", []):
        draw.ellipse((65, bullet_y + 6, 79, bullet_y + 20), fill="#DDF2E4")
        draw.text((88, bullet_y), wrapped(bullet, 29), font=font(16, True), fill=INK, spacing=4)
        bullet_y += 42
    # Persistent subtitle plate makes the film readable even on mute.
    draw.rectangle((0, 570, WIDTH, HEIGHT), fill="#123D35")
    draw.text((64, 584), "KOMPAS RODZICA ZUS  ·  SYMULACJA", font=font(12, True), fill="#A8D9B7")
    return image


def make_panel_variants(path: Path, focus_y: float) -> list[Image.Image]:
    source = Image.open(path).convert("RGB")
    fitted = ImageOps.fit(source, (770, 420), method=Image.Resampling.LANCZOS, centering=(0.5, focus_y))
    variants = []
    for step in range(12):
        zoom = 1.0 + 0.045 * step / 11
        size = (int(770 * zoom), int(420 * zoom))
        larger = fitted.resize(size, Image.Resampling.LANCZOS)
        left = (larger.width - 770) // 2
        max_top = larger.height - 420
        top = int(max_top * (0.32 + 0.30 * step / 11))
        variants.append(larger.crop((left, top, left + 770, top + 420)))
    return variants


def slide_frame(base: Image.Image, panels: list[Image.Image], scene: dict, local_frame: int, speech_frames: int, phase_index: int, phase_frames: int) -> Image.Image:
    progress = local_frame / max(1, scene["duration"] * FPS - 1)
    zoom_step = min(11, int(progress * 12))
    panel = panels[phase_index][zoom_step]
    image = base.copy()
    # Soft card shadow and screenshot frame.
    shadow = Image.new("RGBA", (820, 450), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((9, 10, 812, 442), radius=19, fill=(21, 53, 38, 30))
    image.paste(shadow, (421, 97), shadow)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((430, 102, 1230, 540), radius=17, fill=WHITE, outline="#D7E5DE", width=2)
    image.paste(panel, (445, 111))
    draw.rounded_rectangle((445, 111, 1215, 531), radius=11, outline="#DCECE3", width=1)
    if local_frame < speech_frames:
        caption = wrapped(scene["narration"], 88)
        cap_draw = ImageDraw.Draw(image)
        cap_draw.multiline_text((64, 606), caption, font=font(21), fill=WHITE, spacing=5)
    # A thin animated progress line keeps the held screenshots from feeling static.
    draw.rectangle((64, 710, 1216, 714), fill="#315E50")
    draw.rectangle((64, 710, 64 + int(1152 * progress), 714), fill="#8DE1AC")
    return image


def intro_frame(raw: bytes, local_frame: int, speech_frames: int) -> Image.Image:
    image = Image.frombytes("RGB", (WIDTH, HEIGHT), raw)
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    d.rounded_rectangle((58, 58, 710, 185), radius=22, fill=(255, 253, 247, 232), outline=(220, 236, 227, 235), width=2)
    image = Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")
    draw = ImageDraw.Draw(image)
    draw_compass(draw, 82, 82, 2)
    draw.text((145, 78), "Kompas Rodzica ZUS", font=font(35, True), fill=INK)
    draw.text((147, 125), "Urlopy, świadczenia i plan dla obojga rodziców", font=font(17), fill=GREEN)
    draw.rectangle((0, 570, WIDTH, HEIGHT), fill="#123D35")
    draw.text((64, 584), "KOMPAS RODZICA ZUS  ·  WPROWADZENIE", font=font(12, True), fill="#A8D9B7")
    if local_frame < speech_frames:
        draw.multiline_text((64, 606), wrapped(SCENES[0]["narration"], 88), font=font(21), fill=WHITE, spacing=5)
    draw.rectangle((64, 710, 1216, 714), fill="#315E50")
    intro_frames = max(1, round(SCENES[0]["duration"] * FPS))
    draw.rectangle((64, 710, 64 + int(1152 * local_frame / (intro_frames - 1)), 714), fill="#8DE1AC")
    return image


def outro_frame(scene: dict, local_frame: int, speech_frames: int) -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), "#0F3B32")
    draw = ImageDraw.Draw(image)
    draw.ellipse((850, -180, 1440, 410), fill="#174E40")
    draw.ellipse((-190, 430, 390, 1010), fill="#17483B")
    draw_compass(draw, 94, 88, 3)
    draw.text((190, 98), "KOMPAS RODZICA ZUS", font=font(22, True), fill="#A8D9B7")
    draw.multiline_text((88, 190), "Oblicz  ·  Sprawdź\nZaplanuj", font=font(58, True), fill=WHITE, spacing=14)
    draw.text((92, 405), "Spokojniejszy plan kolejnych kroków dla rodziny.", font=font(23), fill="#D7E9DF")
    for idx, label in enumerate(["OBLICZ", "SPRAWDŹ", "ZAPLANUJ"]):
        x = 94 + idx * 260
        draw.rounded_rectangle((x, 482, x + 226, 532), radius=22, fill="#E5F4E9")
        draw.text((x + 24, 497), label, font=font(17, True), fill=GREEN)
    draw.text((94, 552), "Przykłady są testowe. Sprawdź aktualne wymagania ZUS.", font=font(16), fill="#B9D8C7")
    draw.rectangle((0, 570, WIDTH, HEIGHT), fill="#0B3029")
    draw.text((64, 584), "KOMPAS RODZICA ZUS  ·  DZIĘKUJEMY", font=font(12, True), fill="#A8D9B7")
    if local_frame < speech_frames:
        draw.multiline_text((64, 606), wrapped(scene["narration"], 88), font=font(21), fill=WHITE, spacing=5)
    progress = local_frame / max(1, scene["duration"] * FPS - 1)
    draw.rectangle((64, 710, 1216, 714), fill="#315E50")
    draw.rectangle((64, 710, 64 + int(1152 * progress), 714), fill="#8DE1AC")
    return image


def synthesize_voice(lines: list[str]) -> tuple[int, list[np.ndarray]]:
    library = ctypes.util.find_library("espeak-ng")
    if not library:
        raise RuntimeError("Nie znaleziono lokalnej biblioteki eSpeak-NG.")
    espeak = ctypes.CDLL(library)
    espeak.espeak_Initialize.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_char_p, ctypes.c_int]
    espeak.espeak_Initialize.restype = ctypes.c_int
    espeak.espeak_SetVoiceByName.argtypes = [ctypes.c_char_p]
    espeak.espeak_SetVoiceByName.restype = ctypes.c_int
    espeak.espeak_SetParameter.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_int]
    espeak.espeak_Synth.argtypes = [ctypes.c_void_p, ctypes.c_size_t, ctypes.c_uint, ctypes.c_int, ctypes.c_uint, ctypes.c_uint, ctypes.POINTER(ctypes.c_uint), ctypes.c_void_p]
    espeak.espeak_Synth.restype = ctypes.c_int
    espeak.espeak_Synchronize.restype = ctypes.c_int

    chunks: list[bytes] = []
    callback_type = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.POINTER(ctypes.c_short), ctypes.c_int, ctypes.c_void_p)

    @callback_type
    def callback(samples, count, _events):
        if samples and count:
            chunks.append(ctypes.string_at(samples, count * 2))
        return 0

    espeak.espeak_SetSynthCallback.argtypes = [callback_type]
    espeak.espeak_SetSynthCallback(callback)
    sample_rate = espeak.espeak_Initialize(2, 60, None, 0)
    if sample_rate <= 0 or espeak.espeak_SetVoiceByName(b"pl+f3") != 0:
        raise RuntimeError("Nie udało się uruchomić polskiego głosu eSpeak-NG.")
    espeak.espeak_SetParameter(1, 168, 0)  # rate
    espeak.espeak_SetParameter(3, 57, 0)  # pitch
    espeak.espeak_SetParameter(4, 34, 0)  # pitch range

    audio_lines = []
    for line in lines:
        chunks.clear()
        encoded = line.encode("utf-8")
        unique_id = ctypes.c_uint(0)
        status = espeak.espeak_Synth(encoded, len(encoded) + 1, 0, 0, 0, 1, ctypes.byref(unique_id), None)
        if status != 0 or espeak.espeak_Synchronize() != 0:
            raise RuntimeError("Nie udało się wygenerować polskiej narracji.")
        pcm = np.frombuffer(b"".join(chunks), dtype=np.int16).astype(np.float32) / 32768.0
        if pcm.size == 0:
            raise RuntimeError("Lokalny syntezator nie zwrócił dźwięku.")
        peak = float(np.max(np.abs(pcm)))
        if peak > 0:
            pcm *= 0.64 / peak
        edge = min(int(0.035 * sample_rate), len(pcm) // 8)
        if edge:
            pcm[:edge] *= np.linspace(0, 1, edge, dtype=np.float32)
            pcm[-edge:] *= np.linspace(1, 0, edge, dtype=np.float32)
        audio_lines.append(pcm)
    espeak.espeak_Terminate()
    return sample_rate, audio_lines


def make_soundtrack(audio_lines: list[np.ndarray], narration_path: Path) -> list[float]:
    starts = []
    cursor = 0.0
    for scene, line in zip(SCENES, audio_lines):
        starts.append(cursor)
        length = len(line) / SAMPLE_RATE
        if length > scene["duration"] - 0.05:
            raise RuntimeError(f"Narracja jest za długa dla ujęcia {scene['label']}: {length:.2f}s")
        cursor += scene["duration"]

    count = TOTAL_SECONDS * SAMPLE_RATE
    voice = np.zeros(count, dtype=np.float32)
    speaking = np.zeros(count, dtype=np.float32)
    for start, line in zip(starts, audio_lines):
        offset = int(round(start * SAMPLE_RATE))
        voice[offset:offset + len(line)] += line
        speaking[offset:offset + len(line)] = 1.0

    seconds = np.arange(count, dtype=np.float32) / SAMPLE_RATE
    chords = [
        (130.81, 196.00, 261.63, 329.63),
        (110.00, 164.81, 220.00, 261.63),
        (87.31, 174.61, 220.00, 261.63),
        (98.00, 196.00, 246.94, 293.66),
    ]
    music = np.zeros(count, dtype=np.float32)
    block = 29.0
    for idx, chord in enumerate(chords * 2):
        start = idx * block
        if start >= TOTAL_SECONDS:
            break
        end = min(TOTAL_SECONDS, start + block)
        a, b = int(start * SAMPLE_RATE), int(end * SAMPLE_RATE)
        t = seconds[a:b] - start
        span = end - start
        envelope = np.minimum(1.0, np.minimum(t / 2.8, (span - t) / 3.4)).clip(0, 1)
        pad = np.zeros(b - a, dtype=np.float32)
        for note_idx, frequency in enumerate(chord):
            pad += np.sin(2 * math.pi * frequency * t + note_idx * 0.08).astype(np.float32) * (0.0055 / (note_idx + 1) ** 0.25)
        music[a:b] += pad * envelope
    duck = 0.46 + (1.0 - speaking) * 0.54
    music *= duck
    fade = np.ones(count, dtype=np.float32)
    fade[:int(1.4 * SAMPLE_RATE)] = np.linspace(0, 1, int(1.4 * SAMPLE_RATE), dtype=np.float32)
    fade[-int(2.8 * SAMPLE_RATE):] = np.linspace(1, 0, int(2.8 * SAMPLE_RATE), dtype=np.float32)
    mixed = (voice + music * 0.62) * fade
    mixed = np.tanh(mixed * 1.15) / np.tanh(1.15)
    stereo = np.column_stack((mixed, mixed)).clip(-0.98, 0.98)
    pcm = (stereo * 32767).astype(np.int16)
    with wave.open(str(narration_path), "wb") as stream:
        stream.setnchannels(2)
        stream.setsampwidth(2)
        stream.setframerate(SAMPLE_RATE)
        stream.writeframes(pcm.tobytes())
    return [len(line) / SAMPLE_RATE for line in audio_lines]


def srt_time(seconds: float) -> str:
    millis = int(round(seconds * 1000))
    hours, remainder = divmod(millis, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    whole, millis = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{whole:02d},{millis:03d}"


def write_text_assets(speech_lengths: list[float]) -> None:
    narration = []
    subtitles = []
    cursor = 0.0
    for idx, (scene, length) in enumerate(zip(SCENES, speech_lengths), start=1):
        narration.append(f"{srt_time(cursor).replace(',', '.')}  {scene['label']}\n{scene['narration']}")
        subtitle_end = cursor + min(scene["duration"], length + 0.45)
        subtitles.append(f"{idx}\n{srt_time(cursor)} --> {srt_time(subtitle_end)}\n{wrapped(scene['narration'], 74)}")
        cursor += scene["duration"]
    (ROOT / "narracja-filmiku.txt").write_text("\n\n".join(narration) + "\n", encoding="utf-8")
    (ROOT / "filmik-prezentacyjny.srt").write_text("\n\n".join(subtitles) + "\n", encoding="utf-8")


def push_frame(source, frame: Image.Image, index: int) -> None:
    data = frame.convert("RGB").tobytes()
    buffer = Gst.Buffer.new_allocate(None, len(data), None)
    buffer.fill(0, data)
    buffer.pts = index * Gst.SECOND // FPS
    buffer.duration = Gst.SECOND // FPS
    buffer.offset = index
    status = source.emit("push-buffer", buffer)
    if status != Gst.FlowReturn.OK:
        raise RuntimeError(f"GStreamer przerwał zapis klatki {index}: {status.value_nick}")


def decode_intro() -> tuple[object, object]:
    uri = INTRO.resolve().as_uri()
    description = (
        f'uridecodebin uri="{uri}" caps="video/x-raw" ! videoconvert ! videoscale ! videorate '
        f'! video/x-raw,format=RGB,width={WIDTH},height={HEIGHT},framerate={FPS}/1 '
        '! appsink name=frames sync=false max-buffers=8 drop=false'
    )
    pipeline = Gst.parse_launch(description)
    sink = pipeline.get_by_name("frames")
    pipeline.set_state(Gst.State.PLAYING)
    return pipeline, sink


def pull_intro_frame(sink, index: int) -> bytes:
    sample = sink.emit("try-pull-sample", 12 * Gst.SECOND)
    if sample is None:
        raise RuntimeError(f"Nie udało się odczytać klatki intro Veo nr {index}.")
    buffer = sample.get_buffer()
    ok, mapped = buffer.map(Gst.MapFlags.READ)
    if not ok:
        raise RuntimeError("Nie udało się odczytać bufora klatki intro.")
    try:
        return bytes(mapped.data)
    finally:
        buffer.unmap(mapped)


def render(speech_lengths: list[float] | None = None) -> None:
    scene_frames = [round(scene["duration"] * FPS) for scene in SCENES]
    total_frames = sum(scene_frames)
    total_seconds = total_frames / FPS
    if abs(sum(SCENE_DURATIONS) - TOTAL_SECONDS) > 1e-6 or [round(x * FPS) for x in SCENE_DURATIONS] != scene_frames:
        raise RuntimeError("Nieprawidłowa oś czasu filmu.")
    if total_frames != TOTAL_FRAMES:
        raise RuntimeError(f"Nieprawidłowa liczba klatek w osi czasu: {total_frames}.")
    for scene in SCENES:
        for phase in scene.get("phases", []):
            if not (SHOTS / phase["image"]).exists():
                raise RuntimeError(f"Brakuje zrzutu ekranu: {phase['image']}")
    if not INTRO.exists():
        raise RuntimeError("Brakuje klipu intro Veo.")

    print("Przygotowuję polskie napisy…", flush=True)
    if speech_lengths is None:
        speech_lengths = [scene["duration"] - 0.25 for scene in SCENES]
    if len(speech_lengths) != len(SCENES):
        raise RuntimeError("Liczba długości narracji nie odpowiada liczbie scen.")
    for scene, length in zip(SCENES, speech_lengths):
        if length <= 0 or length > scene["duration"] + 0.02:
            raise RuntimeError(f"Narracja nie mieści się w scenie {scene['label']}: {length:.2f}s")
    write_text_assets(speech_lengths)
    print("Renderuję wersję wizualną…", flush=True)
    pipeline_description = (
            f'appsrc name=vsrc is-live=false block=true format=time caps="video/x-raw,format=RGB,width={WIDTH},height={HEIGHT},framerate={FPS}/1" '
            '! queue max-size-buffers=48 ! videoconvert ! video/x-raw,format=I420 '
            '! x264enc speed-preset=ultrafast tune=zerolatency bitrate=3500 key-int-max=48 bframes=0 '
            '! video/x-h264,stream-format=avc,alignment=au ! queue ! mux.video_0 '
            f'mp4mux name=mux faststart=false ! filesink location="{VISUAL_OUTPUT}"'
        )
    output_pipeline = Gst.parse_launch(pipeline_description)
    video_source = output_pipeline.get_by_name("vsrc")
    output_pipeline.set_state(Gst.State.PLAYING)
    frame_index = 0
    previous = None

    print("Renderuję intro Veo i slajdy…", flush=True)
    intro_pipeline, intro_sink = decode_intro()
    try:
        intro_frames = scene_frames[0]
        for local_frame in range(intro_frames):
            raw = pull_intro_frame(intro_sink, local_frame)
            frame = intro_frame(raw, local_frame, int(speech_lengths[0] * FPS))
            push_frame(video_source, frame, frame_index)
            frame_index += 1
            previous = frame
    finally:
        intro_pipeline.set_state(Gst.State.NULL)

    for scene_index, scene in enumerate(SCENES[1:], start=1):
        page = scene_index + 1
        duration_frames = scene_frames[scene_index]
        speech_frames = int(speech_lengths[scene_index] * FPS)
        base = base_slide(scene, page)
        phase_panels = []
        for phase in scene.get("phases", []):
            phase_panels.append(make_panel_variants(SHOTS / phase["image"], phase.get("focus", 0.5)))

        phase_end_frames = []
        phase_total = sum(phase["seconds"] for phase in scene.get("phases", [])) or scene["duration"]
        elapsed = 0.0
        for phase in scene.get("phases", []):
            elapsed += phase["seconds"]
            phase_end_frames.append(min(duration_frames, int(round(duration_frames * elapsed / phase_total))))

        print(f"Ujęcie {page:02d}/09: {scene['label']}", flush=True)
        for local_frame in range(duration_frames):
            if scene.get("outro"):
                frame = outro_frame(scene, local_frame, speech_frames)
            else:
                phase_index = next(
                    (i for i, end in enumerate(phase_end_frames) if local_frame < end),
                    len(phase_end_frames) - 1,
                )
                phase_start = 0 if phase_index == 0 else phase_end_frames[phase_index - 1]
                phase_end = phase_end_frames[phase_index]
                phase_frames = max(1, phase_end - phase_start)
                frame = slide_frame(
                    base,
                    phase_panels,
                    scene,
                    local_frame,
                    speech_frames,
                    phase_index,
                    phase_frames,
                )
            if local_frame < 12 and previous is not None:
                frame = Image.blend(previous, frame, (local_frame + 1) / 12)
            push_frame(video_source, frame, frame_index)
            frame_index += 1
            if local_frame == duration_frames - 1:
                previous = frame
            if frame_index % (FPS * 20) == 0:
                print(f"  {frame_index // FPS}s / {total_seconds:.2f}s", flush=True)

    if frame_index != TOTAL_FRAMES:
        raise RuntimeError(f"Nieprawidłowa liczba klatek: {frame_index}.")
    if video_source.emit("end-of-stream") != Gst.FlowReturn.OK:
        raise RuntimeError("Nie udało się zamknąć strumienia wideo.")
    bus = output_pipeline.get_bus()
    message = bus.timed_pop_filtered(600 * Gst.SECOND, Gst.MessageType.ERROR | Gst.MessageType.EOS)
    if message is None:
        raise RuntimeError("Renderowanie MP4 przekroczyło limit czasu.")
    if message.type == Gst.MessageType.ERROR:
        error, debug = message.parse_error()
        raise RuntimeError(f"Błąd GStreamera: {error}; {debug}")
    output_pipeline.set_state(Gst.State.NULL)
    print(f"Gotowy plik: {VISUAL_OUTPUT} ({VISUAL_OUTPUT.stat().st_size / 1024 / 1024:.1f} MB)", flush=True)


if __name__ == "__main__":
    render()
