"""
EduAudit AI – Unified Ollama Client
====================================

Async wrapper around the local Ollama REST API that exposes three
capabilities through a single client instance:

* **Chat** (``llama3.2``)  – general-purpose text generation
* **Vision** (``minicpm-v``) – image understanding / document analysis
* **Embeddings** (``nomic-embed-text``) – dense vector embeddings

All HTTP traffic is routed through ``httpx.AsyncClient``.  No cloud
AI SDKs (OpenAI, Anthropic, Google, …) are imported or used.
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Timeout constants (seconds)
# ---------------------------------------------------------------------------
_TIMEOUT_VISION: float = 120.0
_TIMEOUT_CHAT: float = 60.0
_TIMEOUT_EMBED: float = 30.0


def _resolve_base_url() -> str:
    """Return the Ollama base URL, preferring the configured value.

    When running inside a Docker container the default ``localhost`` will
    not reach the host machine.  If the configured URL points at
    ``localhost`` we first probe ``host.docker.internal:11434`` (the
    standard Docker-for-Desktop alias) and silently fall back to
    ``localhost`` if that host is unreachable.
    """
    configured = settings.OLLAMA_BASE_URL

    # Only attempt Docker resolution when the user hasn't overridden the URL
    # and we appear to be inside a container (/.dockerenv exists).
    if "localhost" in configured and os.path.exists("/.dockerenv"):
        docker_url = configured.replace("localhost", "host.docker.internal")
        try:
            # Synchronous probe – this runs once at import time.
            resp = httpx.get(f"{docker_url}/api/tags", timeout=3.0)
            if resp.status_code == 200:
                logger.info(
                    "Detected Docker environment – using Ollama at %s",
                    docker_url,
                )
                return docker_url
        except (httpx.ConnectError, httpx.TimeoutException):
            logger.debug(
                "host.docker.internal unreachable; falling back to %s",
                configured,
            )

    return configured


# ---------------------------------------------------------------------------
# JSON extraction helpers
# ---------------------------------------------------------------------------
_JSON_BLOCK_RE = re.compile(
    r"```(?:json)?\s*\n?(.*?)\n?\s*```",
    re.DOTALL,
)


def _extract_json(text: str) -> dict[str, Any]:
    """Best-effort extraction of a JSON object from free-form LLM text.

    The function tries, in order:

    1. Direct ``json.loads`` on the raw text.
    2. Extracting the first fenced code-block (````json … `````) and
       parsing its content.
    3. Finding the first ``{…}`` substring and parsing that.

    Returns an empty dict on failure so callers never have to guard
    against ``None``.
    """
    # 1. Direct parse
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        pass

    # 2. Fenced code-block
    match = _JSON_BLOCK_RE.search(text)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # 3. First { … } substring
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            pass

    logger.warning("Failed to extract JSON from vision response: %.200s…", text)
    return {}


# ---------------------------------------------------------------------------
# OllamaClient
# ---------------------------------------------------------------------------
class OllamaClient:
    """Async client for the local Ollama REST API.

    Parameters
    ----------
    base_url:
        Root URL of the Ollama server (e.g. ``http://localhost:11434``).
        Resolved automatically via :func:`_resolve_base_url` when *None*.
    """

    def __init__(self, base_url: str | None = None) -> None:
        self.base_url: str = base_url or _resolve_base_url()
        self.chat_model: str = settings.OLLAMA_CHAT_MODEL
        self.vision_model: str = settings.OLLAMA_VISION_MODEL
        self.embed_model: str = settings.OLLAMA_EMBED_MODEL

        # A lazily-created, long-lived async client is used so that the
        # underlying TCP connection pool is reused across requests.
        self._client: httpx.AsyncClient | None = None

        logger.info(
            "OllamaClient initialised – base_url=%s  chat=%s  vision=%s  embed=%s",
            self.base_url,
            self.chat_model,
            self.vision_model,
            self.embed_model,
        )

    # -- internal helpers ---------------------------------------------------

    def _get_client(self) -> httpx.AsyncClient:
        """Return (and lazily create) the shared ``httpx.AsyncClient``."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                # No default timeout – each method specifies its own.
                timeout=httpx.Timeout(None),
            )
        return self._client

    async def close(self) -> None:
        """Shut down the underlying HTTP connection pool."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    # -- public API ---------------------------------------------------------

    async def is_available(self) -> bool:
        """Check whether the Ollama server is reachable.

        Sends ``GET /api/tags`` and returns *True* on a 200 response.
        """
        client = self._get_client()
        try:
            resp = await client.get("/api/tags", timeout=5.0)
            return resp.status_code == 200
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            logger.warning("Ollama health-check failed: %s", exc)
            return False

    # -- chat ---------------------------------------------------------------

    async def chat(self, prompt: str, system_prompt: str = "") -> str:
        """Generate a text completion using the chat model.

        Parameters
        ----------
        prompt:
            The user message / instruction.
        system_prompt:
            Optional system-level instruction prepended to the context.

        Returns
        -------
        str
            The generated text, or an empty string on failure.
        """
        client = self._get_client()
        payload: dict[str, Any] = {
            "model": self.chat_model,
            "prompt": prompt,
            "stream": False,
        }
        if system_prompt:
            payload["system"] = system_prompt

        try:
            resp = await client.post(
                "/api/generate",
                json=payload,
                timeout=_TIMEOUT_CHAT,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("response", "")
        except httpx.TimeoutException:
            logger.error(
                "Ollama chat request timed out after %.0fs", _TIMEOUT_CHAT
            )
            return ""
        except httpx.ConnectError as exc:
            logger.error("Cannot connect to Ollama for chat: %s", exc)
            return ""
        except httpx.HTTPStatusError as exc:
            logger.error("Ollama chat HTTP error: %s", exc)
            return ""

    # -- vision -------------------------------------------------------------

    async def vision(self, image_base64: str, prompt: str) -> dict[str, Any]:
        """Analyse an image using the vision model.

        The Ollama ``/api/generate`` endpoint returns a plain-text
        ``response`` field.  This method parses that text to extract a
        JSON object (handling markdown fenced code-blocks when present).

        Parameters
        ----------
        image_base64:
            Base-64 encoded image data (**without** the
            ``data:image/…;base64,`` prefix).
        prompt:
            Instruction telling the model what to look for / extract.

        Returns
        -------
        dict
            Parsed JSON from the model response, or ``{}`` on failure.
        """
        client = self._get_client()
        payload: dict[str, Any] = {
            "model": self.vision_model,
            "prompt": prompt,
            "images": [image_base64],
            "stream": False,
        }

        try:
            resp = await client.post(
                "/api/generate",
                json=payload,
                timeout=_TIMEOUT_VISION,
            )
            resp.raise_for_status()
            data = resp.json()
            raw_text: str = data.get("response", "")
            return _extract_json(raw_text)
        except httpx.TimeoutException:
            logger.error(
                "Ollama vision request timed out after %.0fs", _TIMEOUT_VISION
            )
            return {}
        except httpx.ConnectError as exc:
            logger.error("Cannot connect to Ollama for vision: %s", exc)
            return {}
        except httpx.HTTPStatusError as exc:
            logger.error("Ollama vision HTTP error: %s", exc)
            return {}

    # -- embeddings ---------------------------------------------------------

    async def embed(self, text: str) -> list[float]:
        """Generate a dense embedding vector for *text*.

        Parameters
        ----------
        text:
            The input string to embed.

        Returns
        -------
        list[float]
            The embedding vector, or an empty list on failure.
        """
        client = self._get_client()
        payload: dict[str, Any] = {
            "model": self.embed_model,
            "prompt": text,
        }

        try:
            resp = await client.post(
                "/api/embeddings",
                json=payload,
                timeout=_TIMEOUT_EMBED,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("embedding", [])
        except httpx.TimeoutException:
            logger.error(
                "Ollama embed request timed out after %.0fs", _TIMEOUT_EMBED
            )
            return []
        except httpx.ConnectError as exc:
            logger.error("Cannot connect to Ollama for embedding: %s", exc)
            return []
        except httpx.HTTPStatusError as exc:
            logger.error("Ollama embed HTTP error: %s", exc)
            return []

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for a list of texts.

        Calls :meth:`embed` sequentially for each item.  Ollama does not
        currently offer a native batch-embedding endpoint, so this is a
        convenience wrapper that keeps the interface clean.

        Parameters
        ----------
        texts:
            Strings to embed.

        Returns
        -------
        list[list[float]]
            One embedding vector per input text.  Failed items are
            represented as empty lists.
        """
        results: list[list[float]] = []
        for idx, text in enumerate(texts):
            try:
                vec = await self.embed(text)
                results.append(vec)
            except Exception as exc:  # noqa: BLE001
                logger.error(
                    "embed_batch – item %d failed: %s", idx, exc
                )
                results.append([])
        return results


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------
ollama_client = OllamaClient()
