import { useEffect, useRef } from "react";
import Lenis from "lenis";
import ParticleField from "./ParticleField";
import ProjectCarousel from "./ProjectCarousel";
import { profile, stats, projects, experience, skills, type Project } from "./data";
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

// Small cosmos icons for the hero meta line (location | school | degree).
const IconPlanet = () => (
  <svg
    viewBox="0 0 16 16"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.3"
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="3.7" />
    <ellipse cx="8" cy="8" rx="7" ry="2.5" transform="rotate(-22 8 8)" />
  </svg>
);
const IconStar = () => (
  <svg
    viewBox="0 0 16 16"
    width="1em"
    height="1em"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M8 1.2l1.25 5.55L14.8 8l-5.55 1.25L8 14.8l-1.25-5.55L1.2 8l5.55-1.25z" />
  </svg>
);
const IconOrbit = () => (
  <svg
    viewBox="0 0 16 16"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.3"
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="1.7" fill="currentColor" stroke="none" />
    <ellipse cx="8" cy="8" rx="6.6" ry="2.7" />
    <ellipse cx="8" cy="8" rx="6.6" ry="2.7" transform="rotate(62 8 8)" />
  </svg>
);

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
  onScrollExit,
}: {
  active: boolean;
  landTop: boolean;
  onReturn: () => void;
  onScrollExit: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const onReturnRef = useRef(onReturn);
  onReturnRef.current = onReturn;
  const onScrollExitRef = useRef(onScrollExit);
  onScrollExitRef.current = onScrollExit;
  const lenisRef = useRef<Lenis | null>(null);

  // 3D tilt: the background plane leans toward the pointer / finger (smoothed via
  // rAF). Transform string is set on the element directly (no CSS calc/var) so it
  // is robust across browsers. Touch is handled explicitly (touchmove) so it also
  // tilts on a phone as you drag/scroll, not just with a mouse.
  useEffect(() => {
    if (!active) return;
    const bg = document.querySelector<HTMLElement>(".pf-bg");
    if (!bg) return;
    let tx = 0,
      ty = 0,
      cx = 0,
      cy = 0,
      raf = 0;
    const setTilt = (clientX: number, clientY: number) => {
      tx = (clientX / window.innerWidth - 0.5) * 2;
      ty = (clientY / window.innerHeight - 0.5) * 2;
    };
    const onPointer = (e: PointerEvent) => setTilt(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) setTilt(t.clientX, t.clientY);
    };
    const loop = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      bg.style.transform = `perspective(1200px) rotateX(${(cy * -5).toFixed(2)}deg) rotateY(${(cx * 5).toFixed(2)}deg) scale(1.12)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onPointer);
    window.addEventListener("touchmove", onTouch, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("touchmove", onTouch);
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
    lenisRef.current = lenis;

    // land at the bottom (deep-zoom dive) or the top (Enter Portfolio button)
    // "Scroll out": push OUT once pinned at the bottom to ascend back into the
    // city. Armed once you've moved up into the content OR a short beat after
    // landing (so a fresh bottom-landing isn't stuck, yet the dive's own
    // momentum can't bounce you straight back out). Accumulated so it takes a
    // deliberate push, not a stray tick.
    let canExit = false;
    let overscroll = 0;
    let exited = false;
    let landed = false;
    requestAnimationFrame(() => {
      lenis.resize();
      lenis.scrollTo(landTop ? 0 : lenis.limit, {
        immediate: true,
        force: true,
      });
      requestAnimationFrame(() => {
        landed = true;
        window.setTimeout(() => {
          canExit = true;
        }, 600);
      });
    });
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
          onScrollExitRef.current();
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
      lenisRef.current = null;
    };
  }, [active, landTop]);

  const featured = projects.filter((p) => p.featured);
  const more = projects.filter((p) => !p.featured);

  // One card renderer for both carousels; `key` is supplied by the carousel
  // (the list is repeated for the infinite loop). Badge/link render when present
  // so new projects only need a `data.ts` entry.
  const card =
    (feature: boolean) =>
    (p: Project, key: string) => (
      <article
        className={`pf-card${feature ? " pf-card--feature" : ""}`}
        key={key}
      >
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
            {p.link.label}
          </a>
        )}
      </article>
    );

  // Smooth-scroll to the Featured Work section via Lenis (no URL hash).
  const scrollToWork = () => {
    const target = scrollRef.current?.querySelector<HTMLElement>("#work");
    if (target) lenisRef.current?.scrollTo(target, { offset: -24 });
  };

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
                <button
                  type="button"
                  className="pf-btn pf-btn--primary"
                  onClick={scrollToWork}
                >
                  View Work
                </button>
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
                <span className="pf-loc__item">
                  <IconPlanet />
                  {profile.location}
                </span>
                <span className="pf-loc__sep">|</span>
                <span className="pf-loc__item">
                  <IconStar />
                  {profile.education.school}
                </span>
                <span className="pf-loc__sep">|</span>
                <span className="pf-loc__item">
                  <IconOrbit />
                  {profile.education.degree}
                </span>
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
            <ProjectCarousel
              items={featured}
              label="Featured work"
              renderItem={card(true)}
            />
          </section>

          {/* ===== MORE PROJECTS ===== */}
          <section className="pf-section">
            <h2 className="pf-h2" data-reveal>
              <span className="pf-h2__idx">02</span> More Projects
            </h2>
            <ProjectCarousel
              items={more}
              label="More projects"
              renderItem={card(false)}
            />
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
