import { Link } from "react-router-dom";
import { work } from "../content/work";
import { allPassages } from "../content/types";

export function HomePage() {
  const first = allPassages(work)[0];
  const firstChapter = work.parts[0].chapters[0];

  return (
    <div className="shell">
      <header className="masthead">
        <Link className="wordmark" to="/">
          Lectio
        </Link>
        <nav className="mast-nav">
          <Link to="/contents">Contents</Link>
          <Link to={`/lectio/${firstChapter.id}/0`}>Begin</Link>
        </nav>
      </header>

      <section className="hero">
        <p className="kicker">{work.author.la}</p>
        <h1>{work.title.la}</h1>
        <p className="author">{work.title.en}</p>
        <p className="lede">
          A quiet reader for Bernard of Clairvaux’s treatise on the twelve steps of
          humility and pride. The Latin is transcribed from the Migne pages you
          supplied; English sits beside it for meditation, not as a substitute
          recension.
        </p>
        <div className="actions">
          <Link className="btn" to={`/lectio/${firstChapter.id}/0`}>
            Open the first passage
          </Link>
          <Link className="btn ghost" to="/contents">
            Browse chapters
          </Link>
        </div>
      </section>

      <section className="notes">
        <p>
          {allPassages(work).length} passages across {work.parts.flatMap((p) => p.chapters).length}{" "}
          chapters. First leaf: {first.plColumn}.
        </p>
        <ul>
          {work.source.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
        <p>
          953–954: <code>MLT_1-4</code> page 3.
          {work.source.missingColumns
            ? ` Missing from the scans: columns ${work.source.missingColumns}.`
            : " Columns 945–946 have no facsimile; the Latin is supplied from Migne."}
        </p>
      </section>
    </div>
  );
}
