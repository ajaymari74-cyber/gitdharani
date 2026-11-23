import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, ShoppingBag, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useProducts } from '../context/ProductsContext';
import { formatProductDisplayName } from '../utils/productFormatters';
import { resolveMediaUrl } from '../services/api';
import sathuMaavuImg from '../assets/sathu_maavu_transparent.webp';
import dharaniAvatar from '../assets/dharani_avatar.webp';
import wildTurmericBannerImg from '../assets/wild_turmeric_offer_banner.jpg';
import bodySoapImg from '../assets/body_soap_transparent.webp';
import chemparuthiShampooImg from '../assets/chemparuthi_shampoo_transparent_v3.webp';
import aloeFacePackImg from '../assets/aloe_vera_face_pack_transparent.webp';
import pirandaiPickleImg from '../assets/pirandai_pickle_transparent_v2.webp';
import './SliderPopup.css';

const CRM_SLIDERS_ENDPOINT = 'http://179.197.251.47:30080/herbal/sliders/';
const AUTO_SLIDE_MS = 3500;

// Shown when the CRM API fails or returns no active sliders
const DEFAULT_FEATURED_OFFERS = [
  {
    id: 1137,
    productName: 'Pirandai Pickle Jar',
    subtitle: 'Authentic Traditional Herbal Digestive Pickle',
    image: pirandaiPickleImg,
    fallbackImage: pirandaiPickleImg,
    link: '/product/1137',
    originalPrice: 72,
    finalPrice: 72,
    discountPercentage: null
  },
  {
    id: 1394,
    productName: 'Wild Turmeric',
    subtitle: '100% Pure Kasturi Manjal for Natural Glow',
    image: wildTurmericBannerImg,
    fallbackImage: wildTurmericBannerImg,
    link: '/product/1394',
    originalPrice: 65,
    finalPrice: 65,
    discountPercentage: null
  },
  {
    id: 1193,
    productName: 'Rose Soap',
    subtitle: 'Botanical Herbal Remedy with Natural Rose',
    image: bodySoapImg,
    fallbackImage: bodySoapImg,
    link: '/product/1193',
    originalPrice: 60,
    finalPrice: 60,
    discountPercentage: null
  },
  {
    id: 1246,
    productName: 'Arappu Shampoo',
    subtitle: 'Traditional Natural Herbal Hair Cleanser',
    image: chemparuthiShampooImg,
    fallbackImage: chemparuthiShampooImg,
    link: '/product/1246',
    originalPrice: 75,
    finalPrice: 75,
    discountPercentage: null
  },
  {
    id: 1011,
    productName: 'Facepack Powder',
    subtitle: 'Herbal Radiance & Skin Nourishment',
    image: aloeFacePackImg,
    fallbackImage: aloeFacePackImg,
    link: '/product/1011',
    originalPrice: 70,
    finalPrice: 70,
    discountPercentage: null
  }
];

const parsePrice = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = parseFloat(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
};

const getFallbackProductImage = (item, matchedProd) => {
  const text = `${item?.title || ''} ${item?.offer || ''} ${matchedProd?.name || ''}`.toLowerCase();
  if (text.includes('pickle') || text.includes('pirandai') || text.includes('thokku')) return pirandaiPickleImg;
  if (text.includes('turmeric') || text.includes('manjal')) return wildTurmericBannerImg;
  if (text.includes('soap')) return bodySoapImg;
  if (text.includes('shampoo') || text.includes('arappu')) return chemparuthiShampooImg;
  if (text.includes('face pack') || text.includes('facepack') || text.includes('gel')) return aloeFacePackImg;
  if (matchedProd?.image) return resolveMediaUrl(matchedProd.image);
  return sathuMaavuImg;
};

const findMatchedProduct = (item, productsList) => {
  if (!productsList.length) return null;

  const productId = Number(item.product_id);
  if (productId) {
    const byId = productsList.find((p) => Number(p.id) === productId);
    if (byId) return byId;
  }

  const title = (item.title || item.offer || item.text_overlay || '').trim().toLowerCase();
  if (!title) return null;

  const words = title
    .replace(/\b(mega offer|offer|deal|special|pack|combo|limited|buy|get|ramcare|herbal|herbbal)\b/gi, '')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  let bestMatch = null;
  let bestScore = 0;
  for (const p of productsList) {
    const pName = (p.name || '').toLowerCase();
    let score = 0;
    if (pName === title) score += 100;
    else if (pName.includes(title) || title.includes(pName)) score += 50;
    for (const w of words) {
      if (pName.includes(w)) score += 10;
    }
    if (score >= 10 && score > bestScore) {
      bestScore = score;
      bestMatch = p;
    }
  }
  return bestMatch;
};

const buildOffer = (item, index, productsList) => {
  const matchedProd = findMatchedProduct(item, productsList);
  const productId = item.product_id || matchedProd?.id;

  const apiImage = item.image || item.image_url || item.url;
  const image = apiImage ? resolveMediaUrl(apiImage) : getFallbackProductImage(item, matchedProd);

  const finalPrice = parsePrice(matchedProd?.price);
  const originalPrice = parsePrice(matchedProd?.mrp) || finalPrice;

  return {
    id: item.id || `crm-${index}`,
    productName: matchedProd?.name || item.title || 'Herbal Wellness Product',
    subtitle: (item.subtitle && !item.subtitle.startsWith('http') && item.subtitle) || matchedProd?.category_name || 'Botanical Herbal Remedy',
    image,
    fallbackImage: getFallbackProductImage(item, matchedProd),
    link: item.link || (productId ? `/product/${productId}` : '/shop'),
    originalPrice,
    finalPrice,
    discountPercentage: parseInt(item.discount_percentage || item.discount, 10) || null
  };
};

export default function SliderPopup() {
  const [offers, setOffers] = useState(DEFAULT_FEATURED_OFFERS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const { isTamil } = useLanguage();
  const { products: contextProducts } = useProducts();
  const navigate = useNavigate();
  const location = useLocation();
  const touchStartRef = useRef(null);
  const touchEndRef = useRef(null);

  const isExcludedRoute =
    location.pathname.startsWith('/checkout') ||
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/cart') ||
    location.pathname.startsWith('/order-success') ||
    location.pathname.startsWith('/admin');

  const isOnProductPage = location.pathname.includes('/product/');

  // Fetch sliders from CRM and merge with product data
  useEffect(() => {
    let isMounted = true;

    const loadOffers = async () => {
      let sliderList = [];
      try {
        const res = await fetch(CRM_SLIDERS_ENDPOINT, {
          headers: { Accept: 'application/json', 'ngrok-skip-browser-warning': 'true' }
        });
        if (res.ok) {
          const data = await res.json();
          sliderList = Array.isArray(data) ? data : data?.value || data?.results || data?.data || [];
        }
      } catch (err) {
        console.warn('SliderPopup CRM fetch error:', err);
      }

      const productsList = contextProducts || [];

      const crmOffers = sliderList
        .filter((item) => item.is_active !== false)
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
        .map((item, index) => buildOffer(item, index, productsList));

      if (!isMounted) return;
      setOffers(crmOffers.length > 0 ? crmOffers : DEFAULT_FEATURED_OFFERS);
      setCurrentIndex(0);
    };

    loadOffers();
    return () => {
      isMounted = false;
    };
  }, [contextProducts]);

  const triggerSparks = useCallback(() => {
    try {
      confetti({
        particleCount: 28,
        spread: 65,
        origin: { y: 0.52, x: 0.5 },
        colors: ['#ffd700', '#22c55e', '#ff9500', '#10b981'],
        shapes: ['circle'],
        scalar: 0.7,
        startVelocity: 30,
        gravity: 1.1,
        ticks: 80,
        zIndex: 999999
      });
    } catch (err) {
      // ignore
    }
  }, []);

  // Open modal from elsewhere in the app
  useEffect(() => {
    const handleOpenModal = () => {
      setIsModalOpen(true);
      triggerSparks();
    };
    window.addEventListener('open-dharani-offer-modal', handleOpenModal);
    return () => window.removeEventListener('open-dharani-offer-modal', handleOpenModal);
  }, [triggerSparks]);

  // Auto-slide while modal is open and mouse is not over the card
  useEffect(() => {
    if (!isModalOpen || offers.length <= 1 || isHovered) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % offers.length);
    }, AUTO_SLIDE_MS);
    return () => clearInterval(timer);
  }, [isModalOpen, offers.length, isHovered]);

  const handleOpenOfferModal = (e) => {
    if (e) e.stopPropagation();
    setIsModalOpen(true);
    triggerSparks();
  };

  const handleCloseModal = (e) => {
    if (e) e.stopPropagation();
    setIsModalOpen(false);
  };

  const handleAction = () => {
    const current = offers[currentIndex];
    setIsModalOpen(false);
    if (current?.link?.startsWith('http')) {
      window.open(current.link, '_blank');
    } else {
      navigate(current?.link || '/shop');
    }
  };

  const nextSlide = () => {
    if (offers.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % offers.length);
  };

  const prevSlide = () => {
    if (offers.length <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? offers.length - 1 : prev - 1));
  };

  const handleTouchStart = (e) => {
    touchEndRef.current = null;
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartRef.current || !touchEndRef.current || offers.length <= 1) return;
    const dist = touchStartRef.current - touchEndRef.current;
    if (dist > 45) nextSlide();
    if (dist < -45) prevSlide();
  };

  const currentOffer = offers[currentIndex] || offers[0];
  if (isExcludedRoute || !currentOffer) return null;

  const isHeroBanner = currentOffer.image === wildTurmericBannerImg;

  return (
    <>
      {/* Floating trigger (bottom-left) */}
      <div
        className={`dharani-mascot-minimized-trigger ${isOnProductPage ? 'on-product-page' : ''}`}
        onClick={handleOpenOfferModal}
        role="button"
        tabIndex={0}
        title={isTamil ? 'சிறப்பு ஆஃபர்கள்' : 'Special Offers'}
        aria-label={isTamil ? 'சிறப்பு ஆஃபர்கள்' : 'Special Offers'}
      >
        <img src={dharaniAvatar} alt="Dharani Avatar" className="minimized-avatar-img" />
        <span className="minimized-offer-badge">
          <Sparkles size={10} />
          <span>{offers.length > 1 ? `${offers.length} OFFERS` : 'OFFER'}</span>
        </span>
      </div>

      {/* Offer modal */}
      {isModalOpen && (
        <div
          className="herbal-offer-modal-overlay"
          onClick={handleCloseModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="offer-modal-title"
        >
          <div
            className="herbal-offer-modal-card"
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="herbal-offer-mascot-modal-header">
              <div className="herbal-offer-mascot-left">
                <img src={dharaniAvatar} alt="Dharani" className="herbal-modal-avatar-thumb" />
                <div>
                  <h4 className="herbal-modal-avatar-title">
                    {isTamil ? 'வணக்கம்! நான் தரணி 🌿' : "Hi! I'm Dharani 🌿"}
                  </h4>
                  <p className="herbal-modal-avatar-sub">
                    {offers.length > 1
                      ? `${currentIndex + 1} / ${offers.length} • ${isTamil ? 'சிறப்பு சலுகைகள்' : 'Special Offers'}`
                      : isTamil
                      ? 'வாடிக்கையாளர்கள் அதிகம் விரும்பும் தயாரிப்புகள்!'
                      : "Customer's Most Loved Products!"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="herbal-offer-close-btn"
                onClick={handleCloseModal}
                aria-label={isTamil ? 'மூடுக' : 'Close offer'}
                title={isTamil ? 'மூடுக' : 'Close'}
              >
                <X size={18} />
              </button>
            </div>

            <div
              className={`herbal-offer-image-frame ${isHeroBanner ? 'has-hero-banner' : 'has-product-stage'}`}
              onClick={handleAction}
              title={isTamil ? 'தயாரிப்பை காண்க' : 'View product details'}
            >
              <img
                key={`${currentOffer.id}-${currentIndex}`}
                src={currentOffer.image}
                alt={currentOffer.productName}
                className={`herbal-offer-img ${isHeroBanner ? 'is-hero-banner' : 'is-product-thumb'}`}
                loading="eager"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = currentOffer.fallbackImage || sathuMaavuImg;
                }}
              />

              <div className="herbal-offer-badge herbal-offer-badge--loved">
                <span>{isTamil ? '⭐ அதிகம் விரும்பப்படும் தயாரிப்பு' : '⭐ Most Loved'}</span>
              </div>

              {offers.length > 1 && (
                <>
                  <button
                    type="button"
                    className="herbal-offer-nav-btn left"
                    onClick={(e) => {
                      e.stopPropagation();
                      prevSlide();
                    }}
                    aria-label="Previous Offer"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    className="herbal-offer-nav-btn right"
                    onClick={(e) => {
                      e.stopPropagation();
                      nextSlide();
                    }}
                    aria-label="Next Offer"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
            </div>

            <div className="herbal-offer-modal-body">
              <span className="herbal-offer-badge-title">
                {isTamil ? 'வாடிக்கையாளர் விருப்பம்' : 'CUSTOMER FAVORITE'}
              </span>

              {currentOffer.productName && (
                <h3 id="offer-modal-title" className="herbal-offer-product-name">
                  {formatProductDisplayName(currentOffer.productName)}
                </h3>
              )}

              {currentOffer.subtitle && (
                <p className="herbal-offer-subtitle">{currentOffer.subtitle}</p>
              )}

              {(currentOffer.originalPrice || currentOffer.finalPrice) && (
                <div className="herbal-offer-pricing-row">
                  <span className="herbal-offer-final-price">
                    ₹{currentOffer.originalPrice || currentOffer.finalPrice}
                  </span>
                  <span className="herbal-loved-tag">
                    {isTamil ? '❤️ அதிகம் விரும்பப்படும் தயாரிப்பு' : '❤️ Most Loved'}
                  </span>
                </div>
              )}

              <div className="herbal-customer-love-box">
                <div className="herbal-customer-love-item">
                  <Sparkles size={15} className="herbal-love-sparkle" />
                  <span>
                    {isTamil
                      ? '10,000+ வாடிக்கையாளர்களால் அதிகம் விரும்பப்பட்டது'
                      : 'Loved by 10,000+ Happy Customers'}
                  </span>
                </div>
                <p className="herbal-customer-love-sub">
                  {isTamil
                    ? '100% தூய இயற்கை மூலிகை தயாரிப்பு • பக்கவிளைவுகள் அற்றது'
                    : '100% Pure Botanical Care • Time-Tested Siddha Wisdom'}
                </p>
              </div>

              <button type="button" className="herbal-offer-action-btn" onClick={handleAction}>
                <ShoppingBag size={17} />
                <span>{isTamil ? 'இப்போதே வாங்க' : 'Shop Now'}</span>
              </button>

              {offers.length > 1 && (
                <div className="herbal-offer-dots" role="tablist">
                  {offers.map((offer, idx) => (
                    <button
                      key={offer.id || idx}
                      type="button"
                      className={`herbal-offer-dot ${idx === currentIndex ? 'active' : ''}`}
                      onClick={() => setCurrentIndex(idx)}
                      aria-label={`Go to offer ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}