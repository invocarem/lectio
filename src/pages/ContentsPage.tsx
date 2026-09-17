import { Link } from "react-router-dom";
import { work } from "../content/work";

export function ContentsPage() {
  return (
    <div className="shell">
      <header className="masthead">
        <Link className="wordmark" to="/">
          Lectio
        </Link>
        <nav className="mast-nav">
          <Link to="/">Home</Link>
        </nav>
      </header>

      {work.parts.map((part) => (
        <section className="part" key={part.id}>
          <p className="kicker">{part.title.en}</p>
          <h2>{part.title.la}</h2>
          <ul className="chapter-list">
            {part.chapters.map((chapter) => (
              <li key={chapter.id}>
                <Link to={`/lectio/${chapter.id}/0`}>
                  <span className="num">{chapter.caput ? `Cap. ${chapter.caput}` : "Praef."}</span>
                  <span>
                    <strong>{chapter.title.la}</strong>
                    <br />
                    <em>{chapter.title.en}</em>
                  </span>
                  <span className="pl">PL {chapter.plColumns}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
