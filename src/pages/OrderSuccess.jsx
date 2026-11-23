import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

// Shown right after a successful payment. Moves on to the customer's orders after a short pause.
const SHOW_DURATION_MS = 4000;

export default function OrderSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const rawOrderId = location.state?.orderId;
  const orderId = rawOrderId && rawOrderId !== 'Completed' ? rawOrderId : null;
  const hasState = Boolean(location.state);

  useEffect(() => {
    // Opened directly without a completed checkout: nothing to confirm, so leave.
    if (!hasState) {
      navigate('/', { replace: true });
      return undefined;
    }
    const timer = setTimeout(() => {
      navigate('/profile', { replace: true, state: { activeTab: 'orders' } });
    }, SHOW_DURATION_MS);
    return () => clearTimeout(timer);
  }, [hasState, navigate]);

  if (!hasState) return null;

  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        background: '#f0fdf4',
      }}
    >
      <div
        style={{
          maxWidth: '420px',
          width: '100%',
          background: '#fff',
          borderRadius: '16px',
          padding: '40px 24px',
          textAlign: 'center',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
          border: '1px solid #bbf7d0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <CheckCircle size={64} color="#16A34A" />
        </div>
        <h2 style={{ color: '#16A34A', fontSize: '1.5rem', fontWeight: 700, marginBottom: '10px' }}>
          Your order is successful
        </h2>
        <p style={{ color: '#374151', fontSize: '1rem', marginBottom: '6px' }}>
          Payment received. Thank you for your order!
        </p>
        {orderId && (
          <p style={{ color: '#6B7280', fontSize: '0.95rem', marginBottom: '6px' }}>
            Order ID: <strong>#{orderId}</strong>
          </p>
        )}
        <p style={{ color: '#9CA3AF', fontSize: '0.85rem', marginTop: '16px' }}>
          Taking you to your orders...
        </p>
      </div>
    </div>
  );
}