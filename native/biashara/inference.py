"""Thin wrapper around llama-cpp-python.

Loads a GGUF model once, streams tokens, and pins to physical cores.
The wrapper is deliberately small: callers build the prompt (including
any retrieved context) and consume the streamed tokens.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator, Optional


def _default_threads() -> int:
    """Sensible default: leave one logical CPU for the OS + UI.

    On a 2-physical-core / 4-logical machine returns 3.
    On an 8-logical target laptop returns 7.
    Falls back to 1 if os.cpu_count() is unavailable.
    """
    logical = os.cpu_count() or 2
    return max(1, logical - 1)


def _pin_to_physical_cores(n: int) -> None:
    """Pin the current process to the first n logical CPU ids.

    Linux only. Silently no-op on other platforms.
    """
    if not hasattr(os, "sched_setaffinity"):
        return
    cores = set(range(min(n, os.cpu_count() or n)))
    try:
        os.sched_setaffinity(0, cores)
    except OSError:
        pass


@dataclass
class LoadCfg:
    ctx: int = 2048
    n_threads: Optional[int] = None
    n_batch: int = 512
    kv_type_k: str = "q8_0"
    kv_type_v: str = "q8_0"
    seed: int = 42
    pin_threads: bool = True


@dataclass
class GenParams:
    max_tokens: int = 512
    temperature: float = 0.3
    top_p: float = 0.9
    repeat_penalty: float = 1.05
    stop: list[str] = field(default_factory=list)
    grammar: Optional[str] = None  # GBNF grammar for structured output


class Session:
    """Single loaded model instance. Not thread safe."""

    def __init__(self, model_path: Path, cfg: LoadCfg | None = None) -> None:
        from llama_cpp import Llama, LlamaGrammar  # local import keeps startup light
        self._Llama = Llama
        self._Grammar = LlamaGrammar
        self.model_path = Path(model_path)
        self.cfg = cfg or LoadCfg()

        threads = self.cfg.n_threads or _default_threads()
        if self.cfg.pin_threads:
            _pin_to_physical_cores(threads)

        # llama.cpp requires flash attention whenever the V cache is not f16.
        needs_flash_attn = self.cfg.kv_type_v != "f16"
        self._llm = Llama(
            model_path=str(self.model_path),
            n_ctx=self.cfg.ctx,
            n_threads=threads,
            n_batch=self.cfg.n_batch,
            type_k=_ggml_type(self.cfg.kv_type_k),
            type_v=_ggml_type(self.cfg.kv_type_v),
            flash_attn=needs_flash_attn,
            seed=self.cfg.seed,
            logits_all=False,
            verbose=False,
        )
        self.n_threads = threads

    def generate(self, prompt: str, params: GenParams | None = None) -> Iterator[str]:
        p = params or GenParams()
        grammar = self._Grammar.from_string(p.grammar) if p.grammar else None
        stream = self._llm.create_completion(
            prompt=prompt,
            max_tokens=p.max_tokens,
            temperature=p.temperature,
            top_p=p.top_p,
            repeat_penalty=p.repeat_penalty,
            stop=p.stop or None,
            stream=True,
            grammar=grammar,
        )
        for chunk in stream:
            piece = chunk["choices"][0].get("text", "")
            if piece:
                yield piece

    def generate_full(self, prompt: str, params: GenParams | None = None) -> str:
        return "".join(self.generate(prompt, params))

    def close(self) -> None:
        # llama-cpp-python frees on GC; explicit close for tests.
        self._llm = None


_GGML_TYPE_MAP = {
    "f16": 1,
    "f32": 0,
    "q8_0": 8,
    "q4_0": 2,
    "q4_1": 3,
    "q5_0": 6,
    "q5_1": 7,
}


def _ggml_type(name: str) -> int:
    try:
        return _GGML_TYPE_MAP[name]
    except KeyError as e:
        raise ValueError(f"unsupported kv cache type: {name}") from e
