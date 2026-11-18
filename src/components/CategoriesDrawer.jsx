import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X, Sparkles, ChevronRight, Layers } from 'lucide-react';
import { useLanguage, getCategoryDisplayName } from '../context/LanguageContext';
import { API_BASE_URL, resolveMediaUrl } from '../services/api';
import './CategoriesDrawer.css';

// Local category fallback images matching the Explore section style
import imgHair from '../assets/chemparuthi_shampoo_transparent_v3.webp';
import imgBody from '../assets/body_soap_transparent.webp';
import imgFood from '../assets/pirandai_pickle_transparent_v2.webp';
import imgSkin from '../assets/aloe_vera_face_pack_transparent.webp';
import imgHealth from '../assets/sathu_maavu_transparent.webp';
import imgBaby from '../assets/nalangu_powder_transparent_v2.webp';
import imgPoojas from '../assets/pooja_oil_transparent_v2.webp';
import imgBeverages from '../assets/beverage_transparent.webp';

const LOCAL_CATEGORY_IMAGES = {
  "Hair": imgHair,
  "Body": imgBody,
  "Food": imgFood,
  "Skin": imgSkin,
  "Health & Wellness": imgHealth,
  "Baby": imgBaby,
  "Poojas": imgPoojas,
  "Beverages": imgBeverages
};

const FALLBACK_CATEGORIES = [
  { id: 2, name: 'Hair' },
  { id: 6, name: 'Skin' },
  { id: 8, name: 'Baby' },
  { id: 4, name: 'Body' },
  { id: 5, name: 'Food' },
  { id: 7, name: 'Health & Wellness' },
  { id: 10, name: 'Beverages' },
  { id: 9, name: 'Poojas' },
  { id: 11, name: 'Sweet n Savories' }
];

export default function CategoriesDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeCategory = searchParams.get('category');
  const { language, t } = useLanguage();

  const [categories, setCategories] = useState(() => {
    try {
      const cached = sessionStorage.getItem('dharani_categories');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return FALLBACK_CATEGORIES;
  });

  // Fetch dynamic categories from backend API
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/categories/`, {
      signal: controller.signal,
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
      .then(res => res.json())
      .then(data => {
        let catsArray = [];
        if (Array.isArray(data)) {
          catsArray = data;
        } else if (data && Array.isArray(data.categories)) {
          catsArray = data.categories;
        } else if (data && Array.isArray(data.data)) {
          catsArray = data.data;
        } else if (data && Array.isArray(data.results)) {
          catsArray = data.results;
        }

        if (catsArray.length > 0) {
          const preferredOrder = [
            "Hair",
            "Skin",
            "Baby",
            "Body",
            "Food",
            "Health & Wellness",
            "Beverages",
            "Poojas",
            "Sweet n Savories"
          ];

          catsArray.sort((a, b) => {
            const indexA = preferredOrder.indexOf(a.name);
            const indexB = preferredOrder.indexOf(b.name);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.name.localeCompare(b.name);
          });

          setCategories(catsArray);
          try {
            sessionStorage.setItem('dharani_categories', JSON.stringify(catsArray));
          } catch (e) {}
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, []);

  // Lock background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  const handleSelectCategory = (catName) => {
    onClose();
    if (!catName || catName === 'All') {
      navigate('/shop');
    } else {
      navigate(`/shop?category=${encodeURIComponent(catName)}`);
    }
  };

  return (
    <div className={`categories-drawer-root ${isOpen ? 'is-open' : ''}`} aria-hidden={!isOpen}>
      {/* Backdrop overlay */}
      <div 
        className="categories-drawer-backdrop" 
        onClick={onClose} 
        aria-label="Close categories panel" 
      />

      {/* Slide-Up Bottom Sheet */}
      <div className="categories-drawer-sheet" role="dialog" aria-modal="true" aria-label="Explore Product Categories">
        {/* Top Drag Handle */}
        <div className="categories-drawer-handle-bar">
          <div className="categories-drawer-handle" />
        </div>

        {/* Drawer Header */}
        <div className="categories-drawer-header">
          <div className="categories-drawer-title-box">
            <div className="categories-drawer-badge">
              <Layers size={13} className="categories-badge-icon" />
              <span>{language === 'ta' ? 'அனைத்து பிரிவுகள்' : 'EXPLORE BY CATEGORY'}</span>
            </div>
            <h2 className="categories-drawer-heading">
              {language === 'ta' ? 'மூலிகைப் பிரிவுகள்' : 'Product Categories'}
            </h2>
          </div>
          <button 
            type="button" 
            className="categories-drawer-close-btn" 
            onClick={onClose}
            aria-label="Close categories"
          >
            <X size={20} strokeWidth={2.4} />
          </button>
        </div>

        {/* Categories Grid List */}
        <div className="categories-drawer-content">
          {/* Explore All Tile */}
          <button
            type="button"
            className={`categories-drawer-card explore-all-card ${!activeCategory || activeCategory === 'All' ? 'is-active' : ''}`}
            onClick={() => handleSelectCategory('All')}
          >
            <div className="categories-card-img-pod explore-all-pod">
              <Sparkles size={24} className="explore-all-icon" />
            </div>
            <div className="categories-card-info">
              <span className="categories-card-name">
                {language === 'ta' ? 'அனைத்தும் காண்க' : 'Explore All Products'}
              </span>
              <span className="categories-card-sub">
                {language === 'ta' ? 'முழு பட்டியல்' : 'View complete catalog'}
              </span>
            </div>
            <ChevronRight size={18} className="categories-card-arrow" />
          </button>

          {/* Dynamic Category Cards */}
          <div className="categories-drawer-grid">
            {categories.map((category) => {
              const categoryImage = resolveMediaUrl(category.image) || LOCAL_CATEGORY_IMAGES[category.name];
              const displayName = getCategoryDisplayName(category.name, language);
              const isSelected = activeCategory === category.name;

              return (
                <button
                  key={category.id || category.name}
                  type="button"
                  className={`categories-drawer-card ${isSelected ? 'is-active' : ''}`}
                  onClick={() => handleSelectCategory(category.name)}
                >
                  <div className="categories-card-img-pod">
                    {categoryImage ? (
                      <img
                        src={`${categoryImage}?v=42`}
                        alt={displayName}
                        className="categories-card-img"
                        loading="lazy"
                        width="54"
                        height="54"
                      />
                    ) : (
                      <Layers size={22} color="#15803d" />
                    )}
                  </div>
                  <div className="categories-card-info">
                    <span className="categories-card-name">{displayName}</span>
                  </div>
                  <ChevronRight size={16} className="categories-card-arrow" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
