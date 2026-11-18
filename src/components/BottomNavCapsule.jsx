import { NavLink, useLocation } from 'react-router-dom';
import { Home, User, ShoppingBag, LayoutGrid } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useMobileNavScroll } from '../context/MobileNavScrollContext';
import CategoriesDrawer from './CategoriesDrawer';
import './BottomNavCapsule.css';

export default function BottomNavCapsule() {
  const { cartCount } = useCart();
  const { language, t } = useLanguage();
  const { showFloatingNav, isCategoriesOpen, closeCategories, toggleCategories } = useMobileNavScroll();
  const location = useLocation();

  const isCategoriesActive = isCategoriesOpen || (location.pathname === '/shop' && location.search.includes('category='));

  return (
    <>
      <nav 
        className={`bottom-nav-capsule-container ${showFloatingNav ? 'is-visible' : 'is-hidden'}`} 
        aria-label="Mobile Bottom Navigation"
        aria-hidden={!showFloatingNav}
      >
        <div className="bottom-nav-capsule">
          {/* 1. Home Button */}
          <NavLink
            to="/"
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
            end
            aria-label={t('home') || 'Home'}
          >
            <Home size={20} className="bottom-nav-icon" />
            <span className="bottom-nav-label">{t('home') || 'Home'}</span>
          </NavLink>

          {/* 2. Profile (My Account) Button */}
          <NavLink
            to="/profile"
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
            aria-label={language === 'ta' ? 'சுயவிவரம்' : 'Profile'}
          >
            <User size={20} className="bottom-nav-icon" />
            <span className="bottom-nav-label">
              {language === 'ta' ? 'சுயவிவரம்' : 'Profile'}
            </span>
          </NavLink>

          {/* 3. Cart Button */}
          <NavLink
            to="/cart"
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
            aria-label={t('cart') || 'Cart'}
          >
            <div className="bottom-nav-icon-wrap">
              <ShoppingBag size={20} className="bottom-nav-icon" />
              {cartCount > 0 && (
                <span className="bottom-nav-badge">{cartCount}</span>
              )}
            </div>
            <span className="bottom-nav-label">{t('cart') || 'Cart'}</span>
          </NavLink>

          {/* 4. Category Button */}
          <button
            type="button"
            className={`bottom-nav-item bottom-nav-btn ${isCategoriesActive ? 'active' : ''}`}
            onClick={toggleCategories}
            aria-label={language === 'ta' ? 'பிரிவுகள்' : 'Category'}
            aria-expanded={isCategoriesOpen}
          >
            <LayoutGrid size={20} className="bottom-nav-icon" />
            <span className="bottom-nav-label">
              {language === 'ta' ? 'பிரிவுகள்' : 'Category'}
            </span>
          </button>
        </div>
      </nav>

      {/* Slide-Up Categories Drawer */}
      <CategoriesDrawer isOpen={isCategoriesOpen} onClose={closeCategories} />
    </>
  );
}
