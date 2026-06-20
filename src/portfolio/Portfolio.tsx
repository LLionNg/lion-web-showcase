import { useEffect, useRef } from "react";
import Lenis from "lenis";
import ParticleField from "./ParticleField";
import { profile, stats, projects, experience, skills } from "./data";
import "./portfolio.css";

// Wrap bare *.devlionng.com domains (and full URLs) in clickable links so URLs
// inside body copy are redirectable.
const URL_RE = /(https?:\/\/[^\s)]+|(?:[a-z0-9-]+\.)+devlionng\.com)/gi;
function linkify(text: string) {
  return text.split(URL_RE).map((part, i) =>
    i % 2 === 1 ? (
      <a
        key={i}
        className="pf-inline-link"
        href={part.startsWith("http") ? part : `https://${part}`}
        target="_blank"
        rel="noreferrer"
      >
        {part}
      </a>
    ) : (
      part
    ),
  );
}

/**
 * The "digital realm" you dive into at the bottom of the zoom. A futuristic,
 * scroll-driven portfolio overlay seeded with real CV content. `active` gates
 * the smooth-scroll + reveal lifecycle and the enter animation; `onReturn`
 * flies back out to the globe.
 */
export default function Portfolio({
  active,
  landTop,
  onReturn,
}: {
  active: boolean;
  landTop: boolean;
  onReturn: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const onReturnRef = useRef(onReturn);
  onReturnRef.current = onReturn;

  // 3D tilt: the background plane leans toward the pointer (smoothed via rAF).
  // Transform string is set on the element directly (no CSS calc/var) so it is
  // robust across browsers.
  useEffect(() => {
    if (!active) return;
    const bg = document.querySelector<HTMLElement>(".pf-bg");
    if (!bg) return;
    let tx = 0,
      ty = 0,
      cx = 0,
      cy = 0,
      raf = 0;
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const loop = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      bg.style.transform = `perspective(1200px) rotateX(${(cy * -5).toFixed(2)}deg) rotateY(${(cx * 5).toFixed(2)}deg) scale(1.12)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
      bg.style.transform = "";
    };
  }, [active]);

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

    // land at the bottom (deep-zoom dive) or the top (Enter Portfolio button)
    let landed = false;
    requestAnimationFrame(() => {
      lenis.resize();
      lenis.scrollTo(landTop ? 0 : lenis.limit, {
        immediate: true,
        force: true,
      });
      // Only AFTER the landing jump can a scroll arm the exit, so neither the
      // jump itself nor Lenis's init scroll (fired at the top) can pre-arm it
      // and bounce a fresh bottom-landing straight back out.
      requestAnimationFrame(() => {
        landed = true;
      });
    });

    // "Scroll out → Earth": keep pushing OUT once pinned at the bottom and we
    // fly back to orbit. Armed only after you've moved up into the content (so
    // landing at the bottom doesn't bounce you out), and accumulated so it
    // takes a deliberate push, not a stray tick or scroll momentum.
    let canExit = false;
    let overscroll = 0;
    let exited = false;
    const nearBottom = () =>
      wrapper.scrollTop >= wrapper.scrollHeight - wrapper.clientHeight - 4;
    // Arm the exit only once you've moved up into the content. Uses the native
    // scroll position so it works for both wheel-driven Lenis and touch.
    const armExit = () => {
      if (!landed) return;
      if (wrapper.scrollTop < wrapper.scrollHeight - wrapper.clientHeight - 120)
        canExit = true;
    };
    lenis.on("scroll", armExit);
    wrapper.addEventListener("scroll", armExit, { passive: true });
    // `dir > 0` = pushing OUT at the bottom (wheel-down, or a finger swiping UP).
    const pushOut = (dir: number, amount: number, threshold: number) => {
      if (exited) return;
      if (dir > 0 && canExit && nearBottom()) {
        overscroll += amount;
        if (overscroll > threshold) {
          exited = true;
          onReturnRef.current();
        }
      } else if (dir < 0 || !nearBottom()) {
        overscroll = 0; // moving up / away cancels the exit intent
      }
    };
    const onWheel = (e: WheelEvent) =>
      pushOut(e.deltaY, Math.abs(e.deltaY), 220);
    wrapper.addEventListener("wheel", onWheel, { passive: true });
    // Touch equivalent (no wheel on mobile): a sustained swipe UP at the bottom.
    let prevTouchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      prevTouchY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? 0;
      const delta = prevTouchY - y; // finger up (push out) -> positive
      prevTouchY = y;
      pushOut(delta, Math.abs(delta), 100);
    };
    wrapper.addEventListener("touchstart", onTouchStart, { passive: true });
    wrapper.addEventListener("touchmove", onTouchMove, { passive: true });

    // Cosmos scroll effect: fade/slide/blur each block by its distance from the
    // viewport centre — content above and below is hidden and slides in as it
    // nears the middle, the blur clearing as it warps into focus.
    const reveals = Array.from(
      wrapper.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    const updateReveals = () => {
      const vh = window.innerHeight;
      for (const el of reveals) {
        const r = el.getBoundingClientRect();
        const d = (r.top + r.height / 2 - vh / 2) / vh;
        const fade = Math.min(1, Math.max(0, (Math.abs(d) - 0.3) / 0.22));
        el.style.opacity = (1 - fade).toFixed(3);
        el.style.transform = `translate3d(0, ${(d * 46).toFixed(1)}px, 0) scale(${(1 - fade * 0.06).toFixed(3)})`;
        el.style.filter = fade > 0.02 ? `blur(${(fade * 7).toFixed(1)}px)` : "";
      }
    };

    let raf = 0;
    const loop = (t: number) => {
      lenis.raf(t);
      updateReveals();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      wrapper.removeEventListener("wheel", onWheel);
      wrapper.removeEventListener("scroll", armExit);
      wrapper.removeEventListener("touchstart", onTouchStart);
      wrapper.removeEventListener("touchmove", onTouchMove);
      lenis.destroy();
    };
  }, [active, landTop]);

  const featured = projects.filter((p) => p.featured);
  const more = projects.filter((p) => !p.featured);

  return (
    <section
      className={`portfolio ${active ? "portfolio--on" : ""}`}
      aria-hidden={!active}
      inert={!active}
    >
      <div className="pf-bg" aria-hidden="true">
        <ParticleField active={active} />
        <div className="pf-aurora" />
        <div className="pf-grid" />
      </div>

      <button className="pf-return" onClick={onReturn} title="Back to orbit">
        Return to orbit
      </button>

      <div className="pf-scroll" ref={scrollRef}>
        <div className="pf-inner">
          {/* ===== HERO ===== */}
          <header className="pf-hero">
            <div className="pf-hero__text">
              <p className="pf-kicker">
                <span className="pf-dot" /> arrived | {profile.handle.toLowerCase()}.exe
              </p>
              <h1 className="pf-name">{profile.name}</h1>
              <p className="pf-role">{profile.title}</p>
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
                  GitHub
                </a>
                <a className="pf-btn" href={`mailto:${profile.email}`}>
                  Email
                </a>
              </div>
              <p className="pf-loc">
                {profile.location} | {profile.education.school} |{" "}
                {profile.education.degree}
              </p>
            </div>
            <img className="pf-portrait" src={profile.avatar} alt={profile.name} />
          </header>

          {/* ===== STATS ===== */}
          <div className="pf-stats" data-reveal>
            {stats.map((s) => (
              <div className="pf-stat" key={s.label}>
                <span
                  className={`pf-stat__value${s.tone ? ` pf-stat__value--${s.tone}` : ""}`}
                >
                  {s.value}
                </span>
                <span className="pf-stat__label">{s.label}</span>
                {s.link && (
                  <a
                    className="pf-stat__link"
                    href={s.link.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {s.link.label}
                  </a>
                )}
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
                      {p.link.label}                    </a>
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
                      <li key={i}>{linkify(pt)}</li>
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

          {/* ===== CONTACT ===== (the landing anchor — not faded by the scroll effect) */}
          <footer className="pf-contact">
            <h2 className="pf-contact__title">
              Let's explore the unknown across a boundless sea of stars.
            </h2>
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
                GitHub              </a>
            </div>
            <p className="pf-foot">
              (c) {profile.name} | {profile.location} | crafted in the space
              between stars
            </p>
          </footer>
        </div>
      </div>
    </section>
  );
}
