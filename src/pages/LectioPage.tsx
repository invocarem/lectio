import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { DictPopup } from "../components/DictPopup";
import { LatinText } from "../components/LatinText";
import { allChapters, findChapter } from "../content/types";
import { work } from "../content/work";

const STORAGE_KEY = "lectio:last";

type DictOpen = {
  word: string;
  index: number;
  anchor: DOMRect;
};

export function LectioPage() {
  const { chapterId = "", passageIndex = "0" } = useParams();
  const navigate = useNavigate();
  const chapter = findChapter(work, chapterId);
  const index = Number(passageIndex);
  const [mode, setMode] = useState<"both" | "la" | "en">("both");
  const [stepId, setStepId] = useState(work.lectio.steps[0].id);
  const [dict, setDict] = useState<DictOpen | null>(null);

  const sequence = useMemo(() => {
    const chapters = allChapters(work);
    return chapters.flatMap((ch) =>
      ch.passages.map((passage, passageIdx) => ({
        chapterId: ch.id,
        passageIdx,
        passage,
      })),
    );
  }, []);

  const closeDict = useCallback(() => setDict(null), []);

  useEffect(() => {
    setDict(null);
  }, [chapterId, index, mode]);

  if (!chapter || Number.isNaN(index) || !chapter.passages[index]) {
    return <Navigate to="/contents" replace />;
  }

  const passage = chapter.passages[index];
  const globalIndex = sequence.findIndex(
    (item) => item.chapterId === chapter.id && item.passageIdx === index,
  );
  const prev = sequence[globalIndex - 1];
  const next = sequence[globalIndex + 1];
  const step = work.lectio.steps.find((item) => item.id === stepId) ?? work.lectio.steps[0];
  const progress = ((globalIndex + 1) / sequence.length) * 100;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ chapterId: chapter.id, index }));
  } catch {
    /* ignore */
  }

  return (
    <div className="shell lectio">
      <header className="masthead">
        <Link className="wordmark" to="/">
          Lectio
        </Link>
        <nav className="mast-nav">
          <Link to="/contents">Contents</Link>
          <select
            value={chapter.id}
            onChange={(event) => navigate(`/lectio/${event.target.value}/0`)}
            aria-label="Chapter"
          >
            {allChapters(work).map((item) => (
              <option key={item.id} value={item.id}>
                {item.caput ? `Cap. ${item.caput}` : "Praefatio"} — {item.title.en}
              </option>
            ))}
          </select>
        </nav>
      </header>

      <div className="progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="reader">
        <article>
          <p className="meta">
            {chapter.caput ? `Caput ${chapter.caput}` : "Praefatio"}
            {passage.n ? ` · ${passage.n}` : ""} · PL {passage.plColumn}
          </p>
          <h2>{chapter.title.la}</h2>
          <p className="kicker">{chapter.title.en}</p>

          <div className="steps">
            {work.lectio.steps.map((item) => (
              <button
                key={item.id}
                className={`step-btn${item.id === step.id ? " active" : ""}`}
                type="button"
                onClick={() => setStepId(item.id)}
              >
                {item.la}
              </button>
            ))}
          </div>
          <p className="prompt">{step.prompt}</p>

          <div className="toolbar">
            <label>
              View{" "}
              <select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>
                <option value="both">Latin and English</option>
                <option value="la">Latin only</option>
                <option value="en">English only</option>
              </select>
            </label>
            <span>Passage {globalIndex + 1} of {sequence.length}</span>
            {mode !== "en" ? <span className="hint">Click a Latin word for a gloss.</span> : null}
          </div>

          <div className={`passage${passage.lacuna ? " lacuna" : ""}${mode === "both" ? " facing" : " solo"}`}>
            {passage.lacuna && passage.lacunaNote ? <p className="lacuna-note">{passage.lacunaNote}</p> : null}
            {mode !== "en" ? (
              <div className="page page-la">
                {mode === "both" ? <p className="col-label">Latina</p> : null}
                <LatinText
                  text={passage.la}
                  activeIndex={dict?.index ?? null}
                  onSelect={(hit) =>
                    setDict({
                      word: hit.word,
                      index: hit.index,
                      anchor: hit.element.getBoundingClientRect(),
                    })
                  }
                />
              </div>
            ) : null}
            {mode !== "la" ? (
              <div className="page page-en">
                {mode === "both" ? <p className="col-label">English</p> : null}
                <p className="english">{passage.en}</p>
              </div>
            ) : null}
          </div>

          {dict ? <DictPopup word={dict.word} anchor={dict.anchor} onClose={closeDict} /> : null}

          <nav className="nav-passages">
            {prev ? (
              <Link to={`/lectio/${prev.chapterId}/${prev.passageIdx}`}>← Previous</Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link to={`/lectio/${next.chapterId}/${next.passageIdx}`}>Next →</Link>
            ) : (
              <span>End of the treatise</span>
            )}
          </nav>
        </article>
      </div>
    </div>
  );
}

export function lastReadingPath(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { chapterId: string; index: number };
    if (!parsed.chapterId) return null;
    return `/lectio/${parsed.chapterId}/${parsed.index ?? 0}`;
  } catch {
    return null;
  }
}
