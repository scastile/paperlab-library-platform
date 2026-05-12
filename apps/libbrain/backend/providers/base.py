from abc import ABC, abstractmethod


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    async def chat(self, messages: list[dict], model: str = None) -> str:
        """Send a chat completion request and return the response text."""
        ...

    @abstractmethod
    async def classify(self, text: str) -> str:
        """Classify text into a category."""
        ...

    @abstractmethod
    async def tts(self, text: str) -> bytes | None:
        """Generate text-to-speech audio. Returns bytes or None if not supported."""
        ...
