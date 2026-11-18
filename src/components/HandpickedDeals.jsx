import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../context/ProductsContext';
import { useLanguage } from '../context/LanguageContext';
import { API_BASE_URL, resolveMediaUrl } from '../services/api';
import { formatProductDisplayName, formatProductPackSize, formatCurrency } from '../utils/productFormatters';
import ProductCard from './ProductCard';
import './HandpickedDeals.css';

export default function HandpickedDeals() {
  const { products, getProductById } = useProducts();
  const { t } = useLanguage();
  const [newProductsList, setNewProductsList] = useState(() => {
    try {
      const cached = sessionStorage.getItem('dharani_new_products_live_mem');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [loadingNew, setLoadingNew] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    // Fetch dynamically from server endpoint /herbal/new-products/ with instant race
    const fetchNewProducts = async () => {
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const endpoints = isHttps
        ? [
            'https://vedanmart.com/herbal/new-products/',
            '/herbal/new-products/',
            `${API_BASE_URL}/new-products/`,
            'https://www.dharaniherbbals.in/herbal/new-products/',
            '/api/new-products/',
            'http://179.197.251.47:30080/herbal/new-products/'
          ]
        : [
            'http://179.197.251.47:30080/herbal/new-products/',
            'https://vedanmart.com/herbal/new-products/',
            '/herbal/new-products/',
            `${API_BASE_URL}/new-products/`,
            'https://www.dharaniherbbals.in/herbal/new-products/',
            '/api/new-products/'
          ];

      const applyNewData = (rawList) => {
        if (!isMounted || !Array.isArray(rawList)) return;
        const activeList = rawList.filter(item => item.is_new !== false && item.is_active !== false);
        setNewProductsList(activeList);
        setLoadingNew(false);
        try {
          sessionStorage.setItem('dharani_new_products_live_mem', JSON.stringify(activeList));
        } catch (e) {}
      };

      const fetchSingle = async (url) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        try {
          const res = await fetch(url, {
            cache: 'no-store',
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
              'ngrok-skip-browser-warning': 'true'
            }
          });
          clearTimeout(timeoutId);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          const rawList = Array.isArray(json) ? json : (json.data || json.results || []);
          if (Array.isArray(rawList)) return rawList;
          throw new Error('Empty');
        } catch (e) {
          clearTimeout(timeoutId);
          throw e;
        }
      };

      // Fast race top 3
      try {
        const fastest = await Promise.any(endpoints.slice(0, 3).map(fetchSingle));
        applyNewData(fastest);
        return;
      } catch (raceErr) {
        for (const url of endpoints.slice(3)) {
          try {
            const rawList = await fetchSingle(url);
            applyNewData(rawList);
            return;
          } catch (e) {}
        }
      }

      if (isMounted) setLoadingNew(false);
    };

    fetchNewProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const dealProducts = useMemo(() => {
    // 1. Strictly display dynamic products from the new-products API
    if (newProductsList && newProductsList.length > 0) {
      return newProductsList.map((item) => {
        // If product already exists in main catalog with full enriched data, merge it!
        const existing = (getProductById ? getProductById(item.id) : null) || (products || []).find(p => p.id === item.id);
        const itemImg = item.image ? resolveMediaUrl(item.image) : null;
        
        if (existing) {
          return {
            ...existing,
            ...item,
            name: formatProductDisplayName(item.name || existing.name),
            raw_name: item.name || existing.raw_name,
            tamil_name: formatProductDisplayName(item.tamil_name || existing.tamil_name),
            price: (item.customer_price || item.price) ? formatCurrency(item.customer_price || item.price) : existing.price,
            image: itemImg || existing.image || (Array.isArray(item.extra_images) && item.extra_images[0] ? resolveMediaUrl(item.extra_images[0]) : ''),
            badge: 'NEW',
            badgeColor: 'green'
          };
        }

        const displayName = formatProductDisplayName(item.name);
        const displayTamilName = formatProductDisplayName(item.tamil_name || item.name);
        const priceNum = parseFloat(item.customer_price || item.price || item.mrp || 0);
        const mrpNum = parseFloat(item.mrp || item.price || 0);

        return {
          id: item.id,
          brand: item.brand || 'Dharani Herbals',
          brand_id: item.brand_id || null,
          name: displayName,
          raw_name: item.name,
          tamil_name: displayTamilName,
          subtitle: item.description ? (item.description.length > 70 ? item.description.substring(0, 70) + '...' : item.description) : 'Pure authentic South Indian botanical formulation.',
          price: formatCurrency(priceNum),
          originalPrice: mrpNum > priceNum ? formatCurrency(mrpNum) : '',
          discount: mrpNum > priceNum ? `${Math.round(((mrpNum - priceNum) / mrpNum) * 100)}% OFF` : '',
          rating: 5.0,
          reviews: 1,
          badge: 'NEW',
          badgeColor: 'green',
          image: (item.image ? resolveMediaUrl(item.image) : '') || (Array.isArray(item.extra_images) && item.extra_images[0] ? resolveMediaUrl(item.extra_images[0]) : ''),
          category_name: item.category_name || (item.category === 7 ? 'Health & Wellness' : 'Herbal Care'),
          description: item.description || 'Pure authentic South Indian botanical formulation for natural health and beauty.',
          pack_size: formatProductPackSize(item) || '50g',
          variations: []
        };
      });
    }

    // Absolutely NO fallback to random catalog products: if CRM returns no new products, show empty list!
    return [];
  }, [newProductsList, products, getProductById]);

  if (!loadingNew && dealProducts.length === 0) {
    return null;
  }

  return (
    <div className="deals-container">
      <div className="reveal bento-header" style={{ background: 'linear-gradient(135deg, rgba(74,222,128,0.2) 0%, rgba(34,197,94,0.1) 100%)', borderColor: 'rgba(74,222,128,0.3)' }}>
        <div className="bento-header-blob right"></div>
        <div className="bento-title-col">
          <h2 className="bento-title-text">
            <div>{t('trendingProducts')}</div>
          </h2>
        </div>
        <div className="bento-desc-col">
          <p className="bento-desc-text">
            {t('trendingDesc')}
          </p>
        </div>
      </div>

      <div className="shop-grid deals-grid reveal">
        {dealProducts.map((product, idx) => (
          <ProductCard key={product.id} product={product} index={idx} />
        ))}
      </div>
    </div>
  );
}
