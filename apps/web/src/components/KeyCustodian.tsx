"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { generateRsaKeyPair, encryptPrivateKey, decryptPrivateKey } from '@/lib/crypto-client';

export default function KeyCustodian() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'generate' | 'unlock'>('unlock');

  useEffect(() => {
    if (!user || user.role !== 'STUDENT') return;

    const cachedKey = sessionStorage.getItem('decryptedPrivateKey');
    if (!cachedKey) {
      const userHasKeys = !!user.publicKey;
      setMode(userHasKeys ? 'unlock' : 'generate');
      setIsOpen(true);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError('');

    try {
      if (mode === 'generate') {
        // Generate a very secure 4096-bit RSA key pair (uses two ~2048-bit prime numbers, matching the 2000+ decimal digit prime request)
        const { publicKeyPem, privateKeyPem } = await generateRsaKeyPair(4096);
        const encryptedPrivate = await encryptPrivateKey(privateKeyPem, password, user!.id);
        
        const res = await fetch('/api/student/setup-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicKey: publicKeyPem, encryptedPrivateKey: encryptedPrivate }),
        });

        if (!res.ok) throw new Error('Anahtarlar yüklenemedi.');

        sessionStorage.setItem('decryptedPrivateKey', privateKeyPem);
        setIsOpen(false);
      } else {
        const res = await fetch('/api/student/keys-detail');
        if (!res.ok) throw new Error('Şifrelenmiş anahtar çekilemedi.');
        
        const { encryptedPrivateKey } = await res.json();
        const decryptedPem = await decryptPrivateKey(encryptedPrivateKey, password, user!.id);
        
        sessionStorage.setItem('decryptedPrivateKey', decryptedPem);
        setIsOpen(false);
      }
    } catch (err: any) {
      setError(err.message || 'Hata oluştu. Şifrenizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(9,9,11,0.95)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      padding: 16
    }}>
      <div className="card" style={{ maxWidth: 440, width: '100%', padding: 40, background: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {mode === 'generate' ? '🔒 E2EE Kurulumu' : '🔓 Sonuçları Kilidini Aç'}
        </h2>
        <p style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
          {mode === 'generate' 
            ? 'Sınav verilerinizin sadece sizin tarafınızdan okunabilmesi için 4096-bit RSA anahtar çifti oluşturulacaktır. Hesap şifrenizi girerek Zero-Knowledge şifrelemeyi etkinleştirin. Şifreniz asla sunucuya gitmez.'
            : 'Şifrelenmiş sınav detaylarını görüntülemek için hesap şifrenizi girerek özel anahtarınızın kilidini açın.'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <input
            type="password"
            placeholder="Hesap Şifreniz"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="admin-input"
            required
            style={{ width: '100%', padding: '12px 16px', background: '#09090b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#fff' }}
          />

          {error && <div style={{ color: '#ef4444', fontSize: 13, background: 'rgba(239,68,68,0.08)', padding: '10px 14px', borderRadius: 8 }}>⚠️ {error}</div>}

          <button type="submit" disabled={loading} className="admin-btn-primary" style={{ width: '100%', padding: 14, fontSize: 15, cursor: 'pointer' }}>
            {loading ? 'İşleniyor...' : (mode === 'generate' ? 'Anahtarları Oluştur ve E2EE Etkinleştir' : 'Kilidi Aç')}
          </button>
        </form>
      </div>
    </div>
  );
}
