import React, { useState, useEffect } from 'react';
import CustomSelect from './CustomSelect';

const capitalizeWords = (str) => {
  if (!str) return '';
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function SettingsModal({ isOpen, onClose, onSave, customAddresses, onCustomAddressesChange, inline = false }) {
  const [activeTab, setActiveTab] = useState('Tidy'); // Tidy, AllCare, Elite, Users
  const [places, setPlaces] = useState([]);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [particulars, setParticulars] = useState([]);
  const [newParticularName, setNewParticularName] = useState('');
  const [newParticularRate, setNewParticularRate] = useState('');
  const [types, setTypes] = useState([]);
  const [newTypeName, setNewTypeName] = useState('');

  // AllCare dynamic places based on type
  const [newPlaceTypeName, setNewPlaceTypeName] = useState('');
  const [newPlaceRate, setNewPlaceRate] = useState('');

  // Users
  const [users, setUsers] = useState([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPin, setNewUserPin] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');

  // Fetch places, particulars and types whenever the settings modal is opened
  useEffect(() => {
    if (isOpen) {
      fetchPlaces();
      fetchParticulars();
      fetchTypes();
      fetchUsers();
    }
  }, [isOpen]);

  const fetchPlaces = async () => {
    try {
      const response = await fetch('/api/places');
      if (response.ok) {
        const data = await response.json();
        setPlaces(data);
      }
    } catch (err) {
      console.error('Failed to fetch places:', err);
    }
  };

  const fetchParticulars = async () => {
    try {
      const response = await fetch('/api/particulars');
      if (response.ok) {
        const data = await response.json();
        setParticulars(data);
      }
    } catch (err) {
      console.error('Failed to fetch particulars:', err);
    }
  };

  const fetchTypes = async () => {
    try {
      const response = await fetch('/api/types');
      if (response.ok) {
        const data = await response.json();
        setTypes(data);
      }
    } catch (err) {
      console.error('Failed to fetch types:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const handleAddPlace = async (companyName) => {
    if (!newPlaceName.trim()) return;
    try {
      const response = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place_name: newPlaceName.trim(), company: companyName })
      });
      if (response.ok) {
        setNewPlaceName('');
        fetchPlaces();
      }
    } catch (err) {
      console.error('Failed to add place:', err);
    }
  };

  const handleAddPlaceAllCare = async () => {
    if (!newPlaceName.trim() || !newPlaceTypeName) return;
    const rateVal = parseFloat(newPlaceRate) || 0;
    if (rateVal < 0) {
      alert("Rate cannot be negative");
      return;
    }
    try {
      const response = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          place_name: newPlaceName.trim(),
          company: 'All Care',
          type_name: newPlaceTypeName,
          rate: rateVal
        })
      });
      if (response.ok) {
        setNewPlaceName('');
        setNewPlaceTypeName('');
        setNewPlaceRate('');
        fetchPlaces();
      }
    } catch (err) {
      console.error('Failed to add place for All Care:', err);
    }
  };

  const handleDeletePlace = async (placeId) => {
    try {
      const response = await fetch(`/api/places/${placeId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchPlaces();
      }
    } catch (err) {
      console.error('Failed to delete place:', err);
    }
  };

  const handleAddParticular = async (companyName) => {
    if (!newParticularName.trim() || !newParticularRate.trim()) return;
    try {
      const response = await fetch('/api/particulars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          particular_name: newParticularName.trim(),
          rate: parseFloat(newParticularRate) || 0,
          company: companyName
        })
      });
      if (response.ok) {
        setNewParticularName('');
        setNewParticularRate('');
        fetchParticulars();
      }
    } catch (err) {
      console.error('Failed to add particular:', err);
    }
  };

  const handleDeleteParticular = async (particularId) => {
    try {
      const response = await fetch(`/api/particulars/${particularId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchParticulars();
      }
    } catch (err) {
      console.error('Failed to delete particular:', err);
    }
  };

  const handleAddType = async (companyName) => {
    if (!newTypeName.trim()) return;
    try {
      const response = await fetch('/api/types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type_name: newTypeName.trim(), company: companyName })
      });
      if (response.ok) {
        setNewTypeName('');
        fetchTypes();
      }
    } catch (err) {
      console.error('Failed to add type:', err);
    }
  };

  const handleDeleteType = async (typeId) => {
    try {
      const response = await fetch(`/api/types/${typeId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchTypes();
      }
    } catch (err) {
      console.error('Failed to delete type:', err);
    }
  };

  const handleAddUser = async () => {
    if (!newUserName || !newUserName.trim()) return;
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName.trim(),
          pin: (newUserPin || '').trim() || null,
          email: (newUserEmail || '').trim() || null,
          phone: (newUserPhone || '').trim() || null,
        })
      });
      if (response.ok) {
        setNewUserName('');
        setNewUserPin('');
        setNewUserEmail('');
        setNewUserPhone('');
        fetchUsers();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to add user. Status:', response.status, errorData);
        alert(errorData.error || `Failed to create user (Status ${response.status})`);
      }
    } catch (err) {
      console.error('Failed to add user:', err);
      alert(`Network error: ${err.message}`);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (response.ok) fetchUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  // ── Shared styles ────────────────────────────────────────────────────────
  const cardBadge = (count) => (
    <span style={{
      fontSize: '0.72rem', color: 'var(--text-muted)',
      background: 'rgba(255,255,255,0.05)', padding: '2px 9px',
      borderRadius: '20px', border: '1px solid var(--card-border)',
    }}>{count}</span>
  );

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  // ── Tab Icons ────────────────────────────────────────────────────────────
  const IconTidy = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
  const IconAllCare = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
  const IconElite = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12l4 6-10 13L2 9z" />
      <path d="M11 3 8 9l4 13 4-13-3-6" />
      <path d="M2 9h20" />
    </svg>
  );
  const IconPin = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  );
  const IconTag = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  );
  const IconGrid = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  );
  const IconMail = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
    </svg>
  );
  const IconUsers = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
  const IconUser = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );

  const CardHeader = ({ icon, title, count }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '28px', height: '28px', borderRadius: '8px',
          background: 'rgba(139, 92, 246, 0.1)', color: 'var(--primary)'
        }}>{icon}</div>
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.98rem', color: '#ffffff' }}>
          {title}
        </span>
      </div>
      {cardBadge(count)}
    </div>
  );

  // ── Render Helpers ───────────────────────────────────────────────────────
  const renderPlacesList = (dbCompany) => {
    const isAllCare = dbCompany.toLowerCase() === 'all care';
    const filtered = places.filter(p =>
      p.company.toLowerCase() === dbCompany.toLowerCase() ||
      p.company.replace(/\s+/g, '').toLowerCase() === dbCompany.replace(/\s+/g, '').toLowerCase()
    );
    return (
      <div className="settings-glass-card">
        <CardHeader icon={<IconPin />} title="Places" count={filtered.length} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
          {filtered.length === 0
            ? <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No places configured.</span>
            : filtered.map(p => (
              <span key={p.id} className="settings-chip">
                {isAllCare ? `${p.place_name} · ${p.type_name || ''} · ₹${p.rate || 0}` : p.place_name}
                <button type="button" className="settings-chip-delete" onClick={() => handleDeletePlace(p.id)} title="Remove">&times;</button>
              </span>
            ))
          }
        </div>

        {isAllCare ? (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <CustomSelect
              value={newPlaceTypeName}
              onChange={(val) => setNewPlaceTypeName(val)}
              options={types.filter(t => t.company.toLowerCase() === 'all care').map(t => ({ value: t.type_name, label: t.type_name }))}
              placeholder="Select Type"
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
              containerStyle={{ flex: '2 1 140px' }}
            />
            <input type="text" className="settings-input-premium"
              style={{ flex: '2 1 140px' }}
              placeholder="Place Name (e.g. Salem)"
              value={newPlaceName} onChange={(e) => setNewPlaceName(capitalizeWords(e.target.value))}
            />
            <input type="number" min="0" className="settings-input-premium"
              style={{ flex: '1 1 80px' }}
              placeholder="Rate" value={newPlaceRate} onChange={(e) => setNewPlaceRate(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPlaceAllCare(); } }}
            />
            <button type="button" className="btn btn-primary"
              style={{ width: 'auto', padding: '0 1.25rem', fontSize: '0.85rem' }}
              onClick={handleAddPlaceAllCare}>Add</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="text" className="settings-input-premium"
              style={{ flex: 1 }}
              placeholder={`Add new place (e.g. Salem)`}
              value={newPlaceName} onChange={(e) => setNewPlaceName(capitalizeWords(e.target.value))}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPlace(dbCompany); } }}
            />
            <button type="button" className="btn btn-primary"
              style={{ width: 'auto', padding: '0 1.5rem', fontSize: '0.85rem' }}
              onClick={() => handleAddPlace(dbCompany)}>Add</button>
          </div>
        )}
      </div>
    );
  };

  const renderParticularsList = (dbCompany) => {
    const filtered = particulars.filter(p =>
      p.company.toLowerCase() === dbCompany.toLowerCase() ||
      p.company.replace(/\s+/g, '').toLowerCase() === dbCompany.replace(/\s+/g, '').toLowerCase()
    );
    return (
      <div className="settings-glass-card">
        <CardHeader icon={<IconTag />} title="Particulars" count={filtered.length} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
          {filtered.length === 0
            ? <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No particulars configured.</span>
            : filtered.map(p => (
              <span key={p.id} className="settings-chip">
                {p.particular_name} · ₹{p.rate}
                <button type="button" className="settings-chip-delete" onClick={() => handleDeleteParticular(p.id)} title="Remove">&times;</button>
              </span>
            ))
          }
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
          <input type="text" className="settings-input-premium"
            style={{ flex: '2 1 0%', minWidth: 0, width: '100%' }}
            placeholder="Particular Name (e.g. Tea)"
            value={newParticularName} onChange={(e) => setNewParticularName(capitalizeWords(e.target.value))}
          />
          <input type="number" min="0" className="settings-input-premium"
            style={{ flex: '0 0 120px', minWidth: 0, width: '100%' }}
            placeholder="Rate"
            value={newParticularRate} onChange={(e) => setNewParticularRate(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddParticular(dbCompany); } }}
          />
          <button type="button" className="btn btn-primary"
            style={{ width: 'auto', padding: '0 1.25rem', fontSize: '0.85rem', flexShrink: 0 }}
            onClick={() => handleAddParticular(dbCompany)}>Add</button>
        </div>
      </div>
    );
  };

  const renderTypesList = (dbCompany) => {
    const filtered = types.filter(t =>
      t.company.toLowerCase() === dbCompany.toLowerCase() ||
      t.company.replace(/\s+/g, '').toLowerCase() === dbCompany.replace(/\s+/g, '').toLowerCase()
    );
    return (
      <div className="settings-glass-card">
        <CardHeader icon={<IconGrid />} title="Types" count={filtered.length} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
          {filtered.length === 0
            ? <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No types configured.</span>
            : filtered.map(t => (
              <span key={t.id} className="settings-chip">
                {t.type_name}
                <button type="button" className="settings-chip-delete" onClick={() => handleDeleteType(t.id)} title="Remove">&times;</button>
              </span>
            ))
          }
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input type="text" className="settings-input-premium"
            style={{ flex: 1 }}
            placeholder="Add new type (e.g. Loaders)"
            value={newTypeName} onChange={(e) => setNewTypeName(capitalizeWords(e.target.value))}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddType(dbCompany); } }}
          />
          <button type="button" className="btn btn-primary"
            style={{ width: 'auto', padding: '0 1.5rem', fontSize: '0.85rem' }}
            onClick={() => handleAddType(dbCompany)}>Add</button>
        </div>
      </div>
    );
  };

  const renderAddressCard = (title, fields) => (
    <div className="settings-glass-card">
      <CardHeader icon={<IconMail />} title={title} count={fields.length} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.35rem' }}>
        {fields.map(({ label, value, onChange, placeholder }) => (
          <div key={label}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
              {label}
            </label>
            <textarea className="settings-textarea-premium" placeholder={placeholder} value={value} onChange={onChange} />
          </div>
        ))}
      </div>
    </div>
  );

  const renderUsersList = () => (
    <div className="animated-fade-in" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: '1.5rem',
      alignItems: 'start',
    }}>
      {/* User List Card */}
      <div className="settings-glass-card">
        <CardHeader icon={<IconUsers />} title="Users List" count={users.length} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.35rem' }}>
          {users.length === 0
            ? <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No users found.</span>
            : users.map(u => (
              <div key={u.id} className="user-profile-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
                  <div className="user-avatar-solid">
                    {getInitials(u.name)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0 }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff' }}>{u.name}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.05rem' }}>
                      {u.email && <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>✉ {u.email}</span>}
                      {u.phone && <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>☏ {u.phone}</span>}
                      {u.pin && <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>PIN: {'•'.repeat(u.pin.length)}</span>}
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => handleDeleteUser(u.id)}
                  style={{
                    background: 'none', border: 'none', color: 'var(--text-muted)',
                    cursor: 'pointer', fontSize: '1.2rem', padding: '0.2rem 0.5rem',
                    transition: 'color 0.2s ease', flexShrink: 0
                  }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--error)'}
                  onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                  title="Remove User">&times;</button>
              </div>
            ))
          }
        </div>
      </div>

      {/* Add User Card */}
      <div className="settings-glass-card">
        <CardHeader icon={<IconUser />} title="Add New User" count="+" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.35rem' }}>
          {/* 1st Row: Full Name & Phone Number */}
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: '1.5 1 200px' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Full Name *</label>
              <input id="user-name-input" type="text" className="settings-input-premium"
                placeholder="Enter full name" value={newUserName}
                onChange={(e) => setNewUserName(capitalizeWords(e.target.value))} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: '1 1 160px' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Phone Number</label>
              <input type="tel" className="settings-input-premium"
                placeholder="e.g. +91 9876543210" value={newUserPhone}
                onChange={(e) => setNewUserPhone(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUser(); } }} />
            </div>
          </div>

          {/* 2nd Row: Email Address */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Email Address</label>
            <input type="email" className="settings-input-premium"
              placeholder="name@company.com" value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)} />
          </div>

          {/* 3rd Row: Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Password</label>
            <input type="password" className="settings-input-premium"
              placeholder="Password" value={newUserPin}
              onChange={(e) => setNewUserPin(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUser(); } }} />
          </div>

          <button type="button" className="btn btn-primary"
            style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', marginTop: '0.5rem', width: '100%' }}
            onClick={handleAddUser}>Create Account</button>
        </div>
      </div>
    </div>
  );

  if (!inline && !isOpen) return null;

  const outerStyle = inline
    ? { display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }
    : { position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', overflow: 'hidden' };

  const tabs = [
    { id: 'Tidy', label: 'Tidy' },
    { id: 'AllCare', label: 'AllCare' },
    { id: 'Elite', label: 'Elite' },
    { id: 'Users', label: 'Users' }
  ];

  return (
    <div style={outerStyle}>
      {/* Redesigned Premium Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.25rem 2rem',
        borderBottom: '1px solid var(--card-border)',
        flexShrink: 0
      }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.4rem', color: '#ffffff', margin: 0, letterSpacing: '-0.5px' }}>
            System Settings
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
            Manage custom client addresses, locations, service items, and user directories.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ width: 'auto', padding: '0.55rem 1.25rem', fontSize: '0.82rem', borderRadius: '8px' }}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onSave || onClose} style={{ width: 'auto', padding: '0.55rem 1.5rem', fontSize: '0.82rem', borderRadius: '8px' }}>
            Save Changes
          </button>
        </div>
      </div>

      {/* Redesigned 2-Column Dashboard Layout */}
      <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden', height: '100%' }}>
        {/* Left Column: Sidebar */}
        <div style={{
          width: '230px',
          borderRight: '1px solid var(--card-border)',
          padding: '1.5rem 0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem',
          flexShrink: 0
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`settings-sidebar-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right Column: Content Body */}
        <div style={{
          flexGrow: 1,
          overflowY: 'auto',
          padding: '2rem'
        }}>
          {activeTab === 'Tidy' && (
            <div className="animated-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
              {renderPlacesList('Tidy')}
              {renderAddressCard('Client Address', [
                {
                  label: 'Issued To Address',
                  placeholder: 'Enter Issued To Address...',
                  value: customAddresses?.tidy?.client || '',
                  onChange: (e) => onCustomAddressesChange({ ...customAddresses, tidy: { ...customAddresses.tidy, client: e.target.value } }),
                }
              ])}
            </div>
          )}

          {activeTab === 'AllCare' && (
            <div className="animated-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {renderTypesList('All Care')}
                {renderPlacesList('All Care')}
              </div>
              {renderAddressCard('Client Address', [
                {
                  label: 'Billed To Address',
                  placeholder: 'Enter Billed To Address...',
                  value: customAddresses?.allCare?.client || '',
                  onChange: (e) => onCustomAddressesChange({ ...customAddresses, allCare: { ...customAddresses.allCare, client: e.target.value } }),
                }
              ])}
            </div>
          )}

          {activeTab === 'Elite' && (
            <div className="animated-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {renderPlacesList('Elite')}
                {renderParticularsList('Elite')}
              </div>
              {renderAddressCard('Client Addresses', [
                {
                  label: 'Billed To Address',
                  placeholder: 'Enter Billed To Address...',
                  value: customAddresses?.elite?.billTo || '',
                  onChange: (e) => onCustomAddressesChange({ ...customAddresses, elite: { ...customAddresses.elite, billTo: e.target.value } }),
                },
                {
                  label: 'Supply To Address',
                  placeholder: 'Enter Supply To Address...',
                  value: customAddresses?.elite?.supplyTo || '',
                  onChange: (e) => onCustomAddressesChange({ ...customAddresses, elite: { ...customAddresses.elite, supplyTo: e.target.value } }),
                },
              ])}
            </div>
          )}

          {activeTab === 'Users' && renderUsersList()}
        </div>
      </div>
    </div>
  );
}
