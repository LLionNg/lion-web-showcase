import { forwardRef, useImperativeHandle, useState } from "react";

/**
 * Cursor-following stats card for the hovered country. Driven imperatively from
 * the Cesium mouse-move handler via a ref (`set(stats, x, y)` / `set(null,…)`)
 * so high-frequency hover updates don't re-render the whole tree.
 */
export type CountryStats = {
  name: string;
  population: number;
  gdp: number; // millions of USD (Natural Earth GDP_MD)
  continent: string;
  subregion: string;
  income: string;
  iso2: string; // lowercase 2-letter, for the flag
};

export type PopupHandle = {
  set: (data: CountryStats | null, x: number, y: number) => void;
};

const compact = (n: number): string => {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return String(n);
};

const gdp = (md: number): string => {
  if (!Number.isFinite(md) || md < 0) return "—";
  if (md >= 1e6) return "$" + (md / 1e6).toFixed(2) + "T";
  if (md >= 1e3) return "$" + (md / 1e3).toFixed(1) + "B";
  return "$" + md.toFixed(0) + "M";
};

// Natural Earth prefixes income groups like "4. Lower middle income".
const clean = (s: string): string => s.replace(/^\d+\.\s*/, "");

export default forwardRef<PopupHandle>(function CountryPopup(_props, ref) {
  const [s, setS] = useState<{ d: CountryStats; x: number; y: number } | null>(
    null,
  );
  useImperativeHandle(
    ref,
    () => ({ set: (d, x, y) => setS(d ? { d, x, y } : null) }),
    [],
  );
  if (!s) return null;
  const { d, x, y } = s;
  // keep the card near the cursor but on-screen
  const left = Math.min(x + 18, window.innerWidth - 232);
  const top = Math.min(y + 18, window.innerHeight - 188);
  const showFlag = d.iso2.length === 2;
  return (
    <div className="country-popup" style={{ left, top }}>
      <div className="country-popup__head">
        {showFlag && (
          <img
            className="country-popup__flag"
            src={`https://flagcdn.com/${d.iso2}.svg`}
            alt=""
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        )}
        <span className="country-popup__name">{d.name}</span>
      </div>
      <dl className="country-popup__stats">
        <div>
          <dt>Population</dt>
          <dd>{compact(d.population)}</dd>
        </div>
        <div>
          <dt>GDP</dt>
          <dd>{gdp(d.gdp)}</dd>
        </div>
        {d.continent && (
          <div>
            <dt>Continent</dt>
            <dd>{d.continent}</dd>
          </div>
        )}
        {d.subregion && (
          <div>
            <dt>Region</dt>
            <dd>{d.subregion}</dd>
          </div>
        )}
        {d.income && (
          <div>
            <dt>Income</dt>
            <dd>{clean(d.income)}</dd>
          </div>
        )}
      </dl>
    </div>
  );
});
