from pathlib import Path

PATH = Path("src/content/latin.md")


def convert_latin(text: str) -> str:
    return text.replace("J", "I").replace("j", "i")


def main() -> None:
    original = PATH.read_text(encoding="utf-8")
    updated = convert_latin(original)
    PATH.write_text(updated, encoding="utf-8")
    print(f"{PATH}: {'changed' if updated != original else 'already respelt'}")


if __name__ == "__main__":
    main()
