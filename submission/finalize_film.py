#!/usr/bin/env python3
"""Align one ElevenLabs narration track with the nine film scenes and mux it."""

from __future__ import annotations

import sys
from pathlib import Path

import gi
import numpy as np

import render_film as film

gi.require_version("Gst", "1.0")
from gi.repository import Gst  # noqa: E402


Gst.init(None)
SAMPLE_RATE = 22050
WINDOW_SECONDS = 0.02
SILENCE_DB = -36.0
MIN_SCENE_GAP = 0.95


def decode_voice(path: Path) -> np.ndarray:
    description = (
        f'uridecodebin uri="{path.resolve().as_uri()}" caps="audio/x-raw" '
        f'! audioconvert ! audioresample ! audio/x-raw,format=S16LE,rate={SAMPLE_RATE},channels=1 '
        '! appsink name=audio sync=false max-buffers=64 drop=false'
    )
    pipeline = Gst.parse_launch(description)
    sink = pipeline.get_by_name("audio")
    pipeline.set_state(Gst.State.PLAYING)
    chunks = []
    while True:
        sample = sink.emit("try-pull-sample", 5 * Gst.SECOND)
        if sample is None:
            break
        buffer = sample.get_buffer()
        ok, mapped = buffer.map(Gst.MapFlags.READ)
        if not ok:
            pipeline.set_state(Gst.State.NULL)
            raise RuntimeError("Nie udało się odczytać fragmentu audio.")
        try:
            chunks.append(bytes(mapped.data))
        finally:
            buffer.unmap(mapped)
    pipeline.set_state(Gst.State.NULL)
    if not chunks:
        raise RuntimeError("Nie udało się odczytać nagrania lektorskiego.")
    return np.frombuffer(b"".join(chunks), dtype="<i2").astype(np.float32) / 32768.0


def find_scene_gaps(audio: np.ndarray) -> list[tuple[float, float]]:
    window = round(SAMPLE_RATE * WINDOW_SECONDS)
    rms = np.array(
        [np.sqrt(np.mean(audio[start:start + window] ** 2)) for start in range(0, len(audio) - window, window)],
        dtype=np.float32,
    )
    db = 20 * np.log10(np.maximum(rms, 1e-8))
    silent = db < SILENCE_DB
    gaps = []
    start = None
    for index, is_silent in enumerate(silent):
        if is_silent and start is None:
            start = index
        elif not is_silent and start is not None:
            begin, end = start * WINDOW_SECONDS, index * WINDOW_SECONDS
            if end - begin >= MIN_SCENE_GAP:
                gaps.append((begin, end))
            start = None
    if start is not None:
        begin, end = start * WINDOW_SECONDS, len(silent) * WINDOW_SECONDS
        if end - begin >= MIN_SCENE_GAP:
            gaps.append((begin, end))
    if len(gaps) != len(film.SCENES) - 1:
        formatted = ", ".join(f"{a:.2f}–{b:.2f}s" for a, b in gaps) or "brak"
        raise RuntimeError(f"Wykryto {len(gaps)} długich pauz zamiast 8: {formatted}")
    return gaps


def mux_audio(video_path: Path, audio_path: Path, output_path: Path) -> None:
    temporary_output = output_path.with_name("filmik-prezentacyjny.tmp.mp4")
    faststart_file = Path.home() / ".cache" / "kompas-film" / "mp4-faststart.tmp"
    faststart_file.parent.mkdir(parents=True, exist_ok=True)
    description = (
        f'filesrc location="{video_path}" ! qtdemux name=demux demux.video_0 ! queue ! mux.video_0 '
        f'uridecodebin uri="{audio_path.resolve().as_uri()}" caps="audio/x-raw" '
        '! audioconvert ! audioresample ! avenc_aac bitrate=192000 ! aacparse ! queue ! mux.audio_0 '
        f'mp4mux name=mux faststart=true faststart-file="{faststart_file}" ! filesink location="{temporary_output}"'
    )
    pipeline = Gst.parse_launch(description)
    pipeline.set_state(Gst.State.PLAYING)
    message = pipeline.get_bus().timed_pop_filtered(
        600 * Gst.SECOND, Gst.MessageType.ERROR | Gst.MessageType.EOS
    )
    if message is None:
        pipeline.set_state(Gst.State.NULL)
        raise RuntimeError("Łączenie obrazu i dźwięku przekroczyło limit czasu.")
    if message.type == Gst.MessageType.ERROR:
        error, debug = message.parse_error()
        pipeline.set_state(Gst.State.NULL)
        temporary_output.unlink(missing_ok=True)
        raise RuntimeError(f"Błąd łączenia audio z wideo: {error}; {debug}")
    pipeline.set_state(Gst.State.NULL)
    temporary_output.replace(output_path)


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Użycie: python3 submission/finalize_film.py /ścieżka/do/lektor.mp3")
    voice_path = Path(sys.argv[1]).expanduser().resolve()
    if not voice_path.is_file():
        raise SystemExit(f"Nie znaleziono pliku audio: {voice_path}")

    print(f"Odczytuję nagranie: {voice_path}", flush=True)
    audio = decode_voice(voice_path)
    audio_duration = len(audio) / SAMPLE_RATE
    gaps = find_scene_gaps(audio)
    print("Pauzy między scenami:", ", ".join(f"{a:.2f}–{b:.2f}s" for a, b in gaps), flush=True)

    starts = [0] + [round(end * film.FPS) for _, end in gaps]
    total_frames = round(audio_duration * film.FPS)
    ends = starts[1:] + [total_frames]
    scene_frames = [end - start for start, end in zip(starts, ends)]
    speech_frames = [round((begin - previous_end) * film.FPS) for (begin, _), previous_end in zip(gaps, [0] + [end for _, end in gaps[:-1]])]
    speech_frames.append(total_frames - starts[-1])
    if len(scene_frames) != len(film.SCENES) or any(value <= 0 for value in scene_frames):
        raise RuntimeError("Nie udało się dopasować dziewięciu ujęć do nagrania.")
    if any(speech > scene for speech, scene in zip(speech_frames, scene_frames)):
        raise RuntimeError("Fragment lektora wykracza poza czas swojego ujęcia.")

    durations = [frames / film.FPS for frames in scene_frames]
    speech_lengths = [frames / film.FPS for frames in speech_frames]
    film.SCENE_DURATIONS = durations
    film.TOTAL_FRAMES = total_frames
    film.TOTAL_SECONDS = total_frames / film.FPS
    for scene, duration in zip(film.SCENES, durations):
        scene["duration"] = duration

    print(
        "Długości scen:", ", ".join(f"{duration:.2f}s" for duration in durations),
        flush=True,
    )
    film.render(speech_lengths=speech_lengths)
    # The captions are burned into every frame. Remove the same-basename sidecar
    # so media players do not overlay a second set of captions automatically.
    (film.ROOT / "filmik-prezentacyjny.srt").unlink(missing_ok=True)

    final_path = film.ROOT / "filmik-prezentacyjny.mp4"
    print("Dodaję lektora do filmu…", flush=True)
    mux_audio(film.VISUAL_OUTPUT, voice_path, final_path)
    print(f"Gotowy film: {final_path} ({final_path.stat().st_size / 1024 / 1024:.1f} MB)", flush=True)


if __name__ == "__main__":
    main()
