import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowUpRight, LayoutGrid, Leaf } from 'lucide-react';
import { useLanguage, getCategoryDisplayName } from '../context/LanguageContext';
import { API_BASE_URL, resolveMediaUrl } from '../services/api';
import './CategoryStrip.css';

// Original local category images (unchanged mapping)
import imgHair from '../assets/chemparuthi_shampoo_transparent_v3.webp';
import imgBody from '../assets/body_soap_transparent.webp';
import imgFood from '../assets/pirandai_pickle_transparent_v2.webp';
import imgSkin from '../assets/aloe_vera_face_pack_transparent.webp';
import imgHealth from '../assets/sathu_maavu_transparent.webp';
import imgBaby from '../assets/nalangu_powder_transparent_v2.webp';
import imgPoojas from '../assets/pooja_oil_transparent_v2.webp';
import imgBeverages from '../assets/beverage_transparent.webp';

const LOCAL_CATEGORY_IMAGES = {
  'Hair': imgHair,
  'Body': imgBody,
  'Food': imgFood,
  'Skin': imgSkin,
  'Health & Wellness': imgHealth,
  'Baby': imgBaby,
  'Poojas': imgPoojas,
  'Beverages': imgBeverages,
};

// Preferred ordering only. Categories not listed here are NEVER removed;
// they are placed after the preferred ones (alphabetically).
const PREFERRED_ORDER = [
  'Hair',
  'Skin',
  'Baby',
  'Body',
  'Food',
  'Health & Wellness',
  'Beverages',
  'Poojas',
];

// Soft background tone per category (purely visual). Unknown/new categories
// (e.g. Sweet n Savories) automatically use the default tone.
const TINTS = {
  'Hair': '#e3efdc',
  'Skin': '#f5e9dd',
  'Baby': '#f8e8ec',
  'Body': '#e1edea',
  'Food': '#f5ebd0',
  'Health & Wellness': '#e8eed6',
  'Beverages': '#efe3d6',
  'Poojas': '#f6e6cc',
};
const DEFAULT_TINT = '#e8efe3';

// Used only if the API request fails or returns nothing.
const FALLBACK_CATEGORIES = [...PREFERRED_ORDER, 'Sweet n Savories'].map((name, i) => ({
  id: `local-${i}`,
  name,
}));

// Adds ?v=42 (cache-bust) safely, whether or not the URL already has a query string
const withVersion = (url, v = '42') => {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}v=${v}`;
};

const sortCategories = (list) =>
  [...list].sort((a, b) => {
    const ia = PREFERRED_ORDER.indexOf(a.name);
    const ib = PREFERRED_ORDER.indexOf(b.name);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return String(a.name).localeCompare(String(b.name));
  });

const extractList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.categories)) return data.categories;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

/* ---------- Single category card ---------- */
function CategoryCard({ category, displayName, isActive }) {
  // Image priority: API image -> existing local image -> neutral placeholder
  const apiSrc = resolveMediaUrl(category.image);
  const localSrc = LOCAL_CATEGORY_IMAGES[category.name];
  const sources = [apiSrc ? withVersion(apiSrc) : null, localSrc].filter(Boolean);

  const [srcIndex, setSrcIndex] = useState(0);
  const currentSrc = sources[srcIndex];

  return (
    <Link
      to={`/shop?category=${encodeURIComponent(category.name)}`}
      className={`cs-card ${isActive ? 'is-active' : ''}`}
      style={{ '--tint': TINTS[category.name] || DEFAULT_TINT }}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className="cs-stage">
        {currentSrc ? (
          <>
            <span className="cs-ground" aria-hidden="true" />
            <img
              key={currentSrc}
              className="cs-img"
              src={currentSrc}
              alt={displayName}
              width="120"
              height="120"
              decoding="async"
              draggable="false"
              onError={() => setSrcIndex((i) => i + 1)}
            />
          </>
        ) : (
          <span className="cs-placeholder" aria-hidden="true">
            <Leaf size={30} strokeWidth={1.5} />
          </span>
        )}
      </span>

      <span className="cs-foot">
        <span className="cs-name">{displayName}</span>
        <span className="cs-go" aria-hidden="true">
          <ArrowUpRight size={15} />
        </span>
      </span>
    </Link>
  );
}

/* ---------- Category strip ---------- */
export default function CategoryStrip() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const activeCategory = searchParams.get('category');
  const { language, t } = useLanguage();

  // Show the default list immediately (no waiting/blank state); the API list replaces it when it arrives
  const [categories, setCategories] = useState(() => sortCategories(FALLBACK_CATEGORIES));

  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [progress, setProgress] = useState({ thumb: 100, offset: 0 });
  const rafRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const draggedRef = useRef(false);

  // Throttled to one update per frame, and only re-renders when a value really changed
  const updateScrollState = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const el = scrollRef.current;
      if (!el) return;
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const maxScroll = Math.max(scrollWidth - clientWidth, 0);
      setCanScrollLeft(scrollLeft > 8);
      setCanScrollRight(scrollLeft < maxScroll - 8);

      const thumb = scrollWidth > 0 ? Math.min((clientWidth / scrollWidth) * 100, 100) : 100;
      const offset = maxScroll > 0 ? (scrollLeft / maxScroll) * (100 - thumb) : 0;
      const next = { thumb: Math.round(thumb * 10) / 10, offset: Math.round(offset * 10) / 10 };
      setProgress((prev) =>
        prev.thumb === next.thumb && prev.offset === next.offset ? prev : next
      );
    });
  }, []);

  // Fetch categories (API is the source of truth for ALL categories)
  useEffect(() => {
    const controller = new AbortController();
    let unmounted = false;
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    fetch(`${API_BASE_URL}/categories/`, {
      signal: controller.signal,
      headers: { 'ngrok-skip-browser-warning': 'true' },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (unmounted) return;
        const list = extractList(data);
        if (list.length) setCategories(sortCategories(list));
      })
      .catch((err) => {
        if (unmounted) return;
        console.error('Error fetching categories from API:', err);
      })
      .finally(() => clearTimeout(timeoutId));

    return () => {
      unmounted = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  // Scroll position -> arrows + progress bar
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [categories, updateScrollState]);

  // Mouse drag-to-scroll (desktop). Touch devices use native swipe.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;

    let startX = 0;
    let startScroll = 0;
    let down = false;

    const onDown = (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true;
      draggedRef.current = false;
      startX = e.clientX;
      startScroll = el.scrollLeft;
    };
    const onMove = (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!draggedRef.current && Math.abs(dx) > 6) {
        draggedRef.current = true;
        setIsDragging(true);
      }
      if (draggedRef.current) el.scrollLeft = startScroll - dx;
    };
    const onUp = () => {
      if (!down) return;
      down = false;
      setIsDragging(false);
    };
    // A drag must not trigger a category click
    const onClickCapture = (e) => {
      if (draggedRef.current) {
        e.preventDefault();
        e.stopPropagation();
        draggedRef.current = false;
      }
    };
    const onDragStart = (e) => e.preventDefault();

    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    el.addEventListener('click', onClickCapture, true);
    el.addEventListener('dragstart', onDragStart);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      el.removeEventListener('click', onClickCapture, true);
      el.removeEventListener('dragstart', onDragStart);
    };
  }, []);

  // Keep the selected category visible
  useEffect(() => {
    if (!activeCategory || !scrollRef.current) return;
    scrollRef.current
      .querySelector('.cs-card.is-active')
      ?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [categories, activeCategory]);

  const scrollByPage = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = Math.max(260, el.clientWidth * 0.75);
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  // ONLY show on Home Page and Shop Page
  if (location.pathname !== '/' && location.pathname !== '/shop') {
    return null;
  }

  const isTamil = language === 'ta';
  const isScrollable = progress.thumb < 99.5;

  return (
    <section className="cs-section" id="categories" aria-labelledby="cs-title">
      <div className="cs-container">
        <h2 id="cs-title" className="cs-title">
          {isTamil ? 'பாரம்பரிய மூலிகை நலப் பிரிவுகள்' : 'Explore by Wellness Category'}
        </h2>

        <div className={`cs-slider ${canScrollLeft ? 'has-left' : ''} ${canScrollRight ? 'has-right' : ''}`}>
          <button
            type="button"
            className="cs-arrow cs-arrow-left"
            onClick={() => scrollByPage('left')}
            disabled={!canScrollLeft}
            tabIndex={canScrollLeft ? 0 : -1}
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} />
          </button>

          <div
            className={`cs-track ${isDragging ? 'is-dragging' : ''}`}
            ref={scrollRef}
            role="list"
          >
                {/* "All" card clears the category filter */}
                <div role="listitem" className="cs-item" style={{ '--i': 0 }}>
                  <Link
                    to="/shop"
                    className={`cs-card cs-card-all ${!activeCategory ? 'is-active' : ''}`}
                    aria-current={!activeCategory ? 'page' : undefined}
                  >
                    <span className="cs-stage">
                      <span className="cs-all-icon" aria-hidden="true">
                        <LayoutGrid size={30} strokeWidth={1.6} />
                      </span>
                    </span>
                    <span className="cs-foot">
                      <span className="cs-name">
                        {t('allCategory') || (isTamil ? 'அனைத்தும்' : 'All')}
                      </span>
                      <span className="cs-go" aria-hidden="true">
                        <ArrowUpRight size={15} />
                      </span>
                    </span>
                  </Link>
                </div>

                {categories.map((category, index) => (
                  <div
                    role="listitem"
                    className="cs-item"
                    key={category.name}
                    style={{ '--i': index + 1 }}
                  >
                    <CategoryCard
                      category={category}
                      displayName={getCategoryDisplayName(category.name, language)}
                      isActive={activeCategory === category.name}
                    />
                  </div>
                ))}
          </div>

          <button
            type="button"
            className="cs-arrow cs-arrow-right"
            onClick={() => scrollByPage('right')}
            disabled={!canScrollRight}
            tabIndex={canScrollRight ? 0 : -1}
            aria-label="Scroll right"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Scroll progress (only when the row overflows) */}
        {isScrollable && (
          <div className="cs-progress" aria-hidden="true">
            <span
              className="cs-progress-thumb"
              style={{
                width: `${progress.thumb}%`,
                transform: `translateX(${progress.thumb ? (progress.offset / progress.thumb) * 100 : 0}%)`,
              }}
            />
          </div>
        )}
      </div>
    </section>
  );
}