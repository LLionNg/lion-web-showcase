import { useEffect, useRef } from "react";
import Lenis from "lenis";
import ParticleField from "./ParticleField";
import { profile, stats, projects, experience, skills } from "./data";
import "./portfolio.css";

/**
 * The "digital realm" you dive into at the bottom of the zoom. A futuristic,
 * scroll-driven portfolio overlay seeded with real CV content. `active` gates
 * the smooth-scroll + reveal lifecycle and the enter animation; `onReturn`
 * flies back out to the globe.
 */
export default function Portfolio({
  active,
  onReturn,
}: {
  active: boolean;
  onReturn: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const onReturnRef = useRef(onReturn);
  onReturnRef.current = onReturn;

  // Smooth scroll (Lenis) bound to the overlay's own scroll container. You dive
  // in at the BOTTOM — the portfolio's seamless seam with Earth — and scroll UP
  // through the work; pushing further OUT at the bottom flies back to orbit.
  useEffect(() => {
    const wrapper = scrollRef.current;
    const content = wrapper?.firstElementChild as HTMLElement | undefined;
    if (!wrapper || !content || !active) return;
    const lenis = new Lenis({
      wrapper,
      content,
      duration: 1.1,
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });

    // land at the bottom once layout has settled
    requestAnimationFrame(() => {
      lenis.resize();
      lenis.scrollTo(lenis.limit, { immediate: true, force: true });
    });

    // "Scroll out → Earth": keep pushing OUT once pinned at the bottom and we
    // fly back to orbit. Armed only after you've moved up into the content (so
    // landing at the bottom doesn't bounce you out), and accumulated so it
    // takes a deliberate push, not a stray tick or scroll momentum.
    let canExit = false;
    let overscroll = 0;
    let exited = false;
    lenis.on("scroll", () => {
      if (lenis.scroll < lenis.limit - 120) canExit = true;
    });
    const onWheel = (e: WheelEvent) => {
      if (exited) return;
      const atBottom = lenis.scroll >= lenis.limit - 4;
      if (e.deltaY > 0 && canExit && atBottom) {
        overscroll += e.deltaY;
        if (overscroll > 220) {
          exited = true;
          onReturnRef.current();
        }
      } else if (e.deltaY < 0 || !atBottom) {
        overscroll = 0; // moving up / away cancels the exit intent
      }
    };
    wrapper.addEventListener("wheel", onWheel, { passive: true });

    let raf = 0;
    const loop = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      wrapper.removeEventListener("wheel", onWheel);
      lenis.destroy();
    };
  }, [active]);

  // Reveal sections as they scroll into view.
  useEffect(() => {
    if (!active) return;
    const root = scrollRef.current;
    const els = root?.querySelectorAll<HTMLElement>("[data-reveal]");
    if (!els?.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { root, threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [active]);

  const featured = projects.filter((p) => p.featured);
  const more = projects.filter((p) => !p.featured);

  return (
    <section
      className={`portfolio ${active ? "portfolio--on" : ""}`}
      aria-hidden={!active}
    >
      <ParticleField active={active} />
      <div className="pf-aurora" aria-hidden="true" />
      <div className="pf-grid" aria-hidden="true" />

      <button className="pf-return" onClick={onReturn} title="Back to orbit">
        <span className="pf-return__icon">↑</span> Return to orbit
      </button>

      <div className="pf-scroll" ref={scrollRef}>
        <div className="pf-inner">
          {/* ===== HERO ===== */}
          <header className="pf-hero">
            <p className="pf-kicker">
              <span className="pf-dot" /> arrived · {profile.handle.toLowerCase()}.exe
            </p>
            <div className="pf-hero__main">
              <div className="pf-avatar">
                <img
                  src={profile.avatar}
                  alt={profile.name}
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
                <span className="pf-avatar__fallback">SN</span>
              </div>
              <div>
                <h1 className="pf-name">{profile.name}</h1>
                <p className="pf-role">{profile.title}</p>
              </div>
            </div>
            <p className="pf-tagline">{profile.tagline}</p>
            <div className="pf-cta">
              <a className="pf-btn pf-btn--primary" href="#work">
                View Work
              </a>
              <a
                className="pf-btn"
                href={profile.github}
                target="_blank"
                rel="noreferrer"
              >
                GitHub ↗
              </a>
              <a className="pf-btn" href={`mailto:${profile.email}`}>
                Email
              </a>
            </div>
            <p className="pf-loc">
              📍 {profile.location} · {profile.education.school} ·{" "}
              {profile.education.degree} ({profile.education.gpa})
            </p>
          </header>

          {/* ===== STATS ===== */}
          <div className="pf-stats" data-reveal>
            {stats.map((s) => (
              <div className="pf-stat" key={s.label}>
                <span className="pf-stat__value">{s.value}</span>
                <span className="pf-stat__label">{s.label}</span>
              </div>
            ))}
          </div>

          {/* ===== FEATURED WORK ===== */}
          <section className="pf-section" id="work">
            <h2 className="pf-h2" data-reveal>
              <span className="pf-h2__idx">01</span> Featured Work
            </h2>
            <div className="pf-cards">
              {featured.map((p) => (
                <article className="pf-card pf-card--feature" key={p.id} data-reveal>
                  <div className="pf-card__top">
                    <span className="pf-card__year">{p.year}</span>
                    {p.badge && <span className="pf-card__badge">{p.badge}</span>}
                  </div>
                  <h3 className="pf-card__title">{p.title}</h3>
                  <p className="pf-card__blurb">{p.blurb}</p>
                  <div className="pf-tags">
                    {p.tags.map((t) => (
                      <span className="pf-tag" key={t}>
                        {t}
                      </span>
                    ))}
                  </div>
                  {p.link && (
                    <a
                      className="pf-card__link"
                      href={p.link.href}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {p.link.label} ↗
                    </a>
                  )}
                </article>
              ))}
            </div>
          </section>

          {/* ===== MORE PROJECTS ===== */}
          <section className="pf-section">
            <h2 className="pf-h2" data-reveal>
              <span className="pf-h2__idx">02</span> More Projects
            </h2>
            <div className="pf-cards pf-cards--compact">
              {more.map((p) => (
                <article className="pf-card" key={p.id} data-reveal>
                  <div className="pf-card__top">
                    <span className="pf-card__year">{p.year}</span>
                  </div>
                  <h3 className="pf-card__title">{p.title}</h3>
                  <p className="pf-card__blurb">{p.blurb}</p>
                  <div className="pf-tags">
                    {p.tags.map((t) => (
                      <span className="pf-tag" key={t}>
                        {t}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* ===== EXPERIENCE ===== */}
          <section className="pf-section">
            <h2 className="pf-h2" data-reveal>
              <span className="pf-h2__idx">03</span> Experience
            </h2>
            <div className="pf-timeline">
              {experience.map((x) => (
                <div className="pf-tl" key={x.org} data-reveal>
                  <div className="pf-tl__head">
                    <h3 className="pf-tl__role">{x.role}</h3>
                    <span className="pf-tl__period">{x.period}</span>
                  </div>
                  <p className="pf-tl__org">{x.org}</p>
                  <ul className="pf-tl__points">
                    {x.points.map((pt, i) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* ===== SKILLS ===== */}
          <section className="pf-section">
            <h2 className="pf-h2" data-reveal>
              <span className="pf-h2__idx">04</span> Toolbox
            </h2>
            <div className="pf-skills" data-reveal>
              {skills.map((g) => (
                <div className="pf-skillgroup" key={g.group}>
                  <h4 className="pf-skillgroup__name">{g.group}</h4>
                  <div className="pf-tags">
                    {g.items.map((s) => (
                      <span className="pf-tag" key={s}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ===== CONTACT ===== */}
          <footer className="pf-contact" data-reveal>
            <h2 className="pf-contact__title">Let's build something impactful.</h2>
            <div className="pf-cta">
              <a className="pf-btn pf-btn--primary" href={`mailto:${profile.email}`}>
                {profile.email}
              </a>
              <a
                className="pf-btn"
                href={profile.github}
                target="_blank"
                rel="noreferrer"
              >
                GitHub ↗
              </a>
            </div>
            <p className="pf-foot">
              © {profile.name} · {profile.location} · crafted in the space between
              stars
            </p>
          </footer>
        </div>
      </div>
    </section>
  );
}
