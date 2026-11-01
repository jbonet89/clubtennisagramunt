export default function Home() {
  return (
    <main>
      <header>
        <a className="brand" href="/" aria-label="Club Tennis Agramunt, inici">
          CTA<span>Club Tennis Agramunt</span>
        </a>
        <span className="year">Agramunt · Des de 1974</span>
      </header>
      <section aria-labelledby="welcome">
        <p className="eyebrow">Esport. Comunitat. Territori.</p>
        <h1 id="welcome">El tennis<br />ens uneix.</h1>
        <p className="intro">
          Estem preparant la nova casa digital del Club Tennis Agramunt.
          Aviat, més a prop de la pista.
        </p>
        <a className="contact" href="mailto:clubtennisagramunt1974@gmail.com">
          Contacta amb el club <span aria-hidden="true">↗</span>
        </a>
      </section>
      <footer>Club Tennis Agramunt · Urgell</footer>
    </main>
  );
}
