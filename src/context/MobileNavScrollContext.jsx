import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const MobileNavScrollContext = createContext(null);

export function MobileNavScrollProvider({ children }) {
  // isScrolledDown is true when user scrolls DOWN on eligible product listing pages
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const location = useLocation();
  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);

  // Product listing routes where search bar & capsule navigation MUST work
  const isProductListingRoute = Boolean(
    location.pathname === '/' || 
    location.pathname === '/shop' ||
    location.pathname.startsWith('/combo') ||
    location.pathname.startsWith('/bundle')
  );

  // Pages where search bar and capsule navigation MUST NOT work:
  // - Individual Product Details page (/product/:id)
  // - About Us page (/about)
  // - Profile / My Account page (/profile, /wishlist)
  // - Cart page (/cart)
  // - Other informational pages (/contact, /terms, /privacy, /faq, etc.)
  const isMobileNavHiddenRoute = Boolean(
    location.pathname.startsWith('/product/') ||
    location.pathname === '/cart' ||
    location.pathname === '/checkout' ||
    location.pathname === '/profile' ||
    location.pathname === '/wishlist' ||
    location.pathname === '/about' ||
    location.pathname === '/contact' ||
    location.pathname === '/faq' ||
    location.pathname === '/faqs' ||
    location.pathname === '/help' ||
    location.pathname === '/privacy' ||
    location.pathname === '/terms' ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/track')
  );

  // Reset to default navbar when navigating to a new route or search filter
  useEffect(() => {
    setIsScrolledDown(false);
    setIsCategoriesOpen(false);
    lastScrollYRef.current = typeof window !== 'undefined' ? (window.scrollY || window.pageYOffset || 0) : 0;
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleScroll = () => {
      // Strictly disabled on non-product pages
      if (!isProductListingRoute) {
        if (isScrolledDown) setIsScrolledDown(false);
        return;
      }

      // Only active on mobile view (<= 768px)
      if (typeof window !== 'undefined' && window.innerWidth > 768) {
        if (isScrolledDown) setIsScrolledDown(false);
        return;
      }

      if (tickingRef.current) return;
      tickingRef.current = true;

      window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY || window.pageYOffset || 0;
        const TOP_THRESHOLD = 30; // At top of page, always show default navbar
        const SCROLL_DELTA = 8;   // Threshold delta to reliably detect user scroll direction

        // When user is at or near top of page, always restore default navbar
        if (currentScrollY <= TOP_THRESHOLD) {
          setIsScrolledDown(false);
          lastScrollYRef.current = currentScrollY;
          tickingRef.current = false;
          return;
        }

        const delta = currentScrollY - lastScrollYRef.current;

        if (Math.abs(delta) >= SCROLL_DELTA) {
          if (delta > 0) {
            // User scrolls DOWN -> Display fixed top search bar & floating bottom capsule
            setIsScrolledDown(true);
          } else {
            // User scrolls UP -> Hide floating search bar & capsule, restore default navbar
            setIsScrolledDown(false);
          }
          lastScrollYRef.current = currentScrollY;
        }

        tickingRef.current = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isScrolledDown, isProductListingRoute]);

  const openCategories = useCallback(() => {
    if (isProductListingRoute) setIsCategoriesOpen(true);
  }, [isProductListingRoute]);

  const closeCategories = useCallback(() => setIsCategoriesOpen(false), []);

  const toggleCategories = useCallback(() => {
    if (isProductListingRoute) setIsCategoriesOpen(prev => !prev);
  }, [isProductListingRoute]);

  const value = {
    isProductListingRoute,
    isMobileNavHiddenRoute,
    // Active floating state (Active when user scrolls DOWN on eligible product pages)
    showFloatingNav: isProductListingRoute ? isScrolledDown : false,
    isScrolledDown: isProductListingRoute ? isScrolledDown : false,
    // Complementary aliases
    isScrolledUp: isProductListingRoute ? !isScrolledDown : false,
    setIsScrolledDown,
    isCategoriesOpen: isProductListingRoute ? isCategoriesOpen : false,
    openCategories,
    closeCategories,
    toggleCategories
  };

  return (
    <MobileNavScrollContext.Provider value={value}>
      {children}
    </MobileNavScrollContext.Provider>
  );
}

export function useMobileNavScroll() {
  const context = useContext(MobileNavScrollContext);
  if (!context) {
    return {
      isProductListingRoute: false,
      isMobileNavHiddenRoute: false,
      showFloatingNav: false,
      isScrolledDown: false,
      isScrolledUp: false,
      setIsScrolledDown: () => {},
      isCategoriesOpen: false,
      openCategories: () => {},
      closeCategories: () => {},
      toggleCategories: () => {}
    };
  }
  return context;
}
