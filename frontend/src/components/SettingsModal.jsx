import React, { useState, useEffect } from 'react';
import CustomSelect from './CustomSelect';

const capitalizeWords = (str) => {
  if (!str) return '';
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function SettingsModal({ isOpen, onClose, onSave, customAddresses, onCustomAddressesChange }) {
  const [activeTab, setActiveTab] = useState('Tidy'); // Tidy, AllCare, Elite
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

  // Fetch places, particulars and types whenever the settings modal is opened
  useEffect(() => {
    if (isOpen) {
      fetchPlaces();
      fetchParticulars();
      fetchTypes();
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

  const renderPlacesList = (dbCompany, hasTopBorder = false) => {
    const isAllCare = dbCompany.toLowerCase() === 'all care';
    const filtered = places.filter(p => 
      p.company.toLowerCase() === dbCompany.toLowerCase() ||
      p.company.replace(/\s+/g, '').toLowerCase() === dbCompany.replace(/\s+/g, '').toLowerCase()
    );
    return (
      <div className="places-manager-section" style={{ 
        paddingTop: '1rem', 
        borderTop: hasTopBorder ? '1px dashed var(--card-border)' : 'none', 
        marginTop: hasTopBorder ? '1rem' : '0' 
      }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.65rem' }}>
          Places ({filtered.length})
        </h4>
        
        {/* Chips list */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {filtered.length === 0 ? (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No configured places. Add one below!</span>
          ) : (
            filtered.map(p => (
              <span key={p.id} style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.3rem 0.6rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--card-border)',
                borderRadius: '20px',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)'
              }}>
                {isAllCare ? `${p.place_name} - ${p.type_name || ''} (₹${p.rate || 0})` : p.place_name}
                <button
                  type="button"
                  onClick={() => handleDeletePlace(p.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--error)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    padding: '0 2px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontWeight: 'bold'
                  }}
                  title="Remove Place"
                >
                  &times;
                </button>
              </span>
            ))
          )}
        </div>

        {/* Add Input */}
        {isAllCare ? (
          <div style={{ display: 'flex', gap: '0.5rem', paddingLeft: '5px', flexWrap: 'wrap'}}>
            <CustomSelect
              value={newPlaceTypeName}
              onChange={(val) => setNewPlaceTypeName(val)}
              options={types.filter(t => t.company.toLowerCase() === 'all care').map(t => ({ value: t.type_name, label: t.type_name }))}
              placeholder="Select Type"
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
              containerStyle={{ flex: '2 1 150px' }}
            />
            <input
              type="text"
              className="form-input capitalize"
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', flex: '2 1 150px' }}
              placeholder="Place Name (e.g. Salem)"
              value={newPlaceName}
              onChange={(e) => setNewPlaceName(capitalizeWords(e.target.value))}
            />
            <input
              type="number"
              min="0"
              className="form-input"
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', flex: '1 1 80px' }}
              placeholder="Rate"
              value={newPlaceRate}
              onChange={(e) => setNewPlaceRate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddPlaceAllCare();
                }
              }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center' }}
              onClick={handleAddPlaceAllCare}
            >
              Add
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem', paddingLeft: '5px'}}>
            <input
              type="text"
              className="form-input capitalize"
              style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
              placeholder={`Add new place for ${dbCompany} (e.g. Salem)`}
              value={newPlaceName}
              onChange={(e) => setNewPlaceName(capitalizeWords(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddPlace(dbCompany);
                }
              }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center' }}
              onClick={() => handleAddPlace(dbCompany)}
            >
              Add
            </button>
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
      <div className="particulars-manager-section" style={{ paddingTop: '1rem', borderTop: '1px dashed var(--card-border)', marginTop: '1rem' }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.65rem' }}>
          Particulars ({filtered.length})
        </h4>
        
        {/* Chips list */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {filtered.length === 0 ? (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No configured particulars. Add one below!</span>
          ) : (
            filtered.map(p => (
              <span key={p.id} style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.3rem 0.6rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--card-border)',
                borderRadius: '20px',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)'
              }}>
                {p.particular_name} (₹{p.rate})
                <button
                  type="button"
                  onClick={() => handleDeleteParticular(p.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--error)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    padding: '0 2px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontWeight: 'bold'
                  }}
                  title="Remove Particular"
                >
                  &times;
                </button>
              </span>
            ))
          )}
        </div>

        {/* Add Inputs */}
        <div style={{ display: 'flex', gap: '0.5rem', paddingLeft: '5px'}}>
          <input
            type="text"
            className="form-input capitalize"
            style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', flex: 2 }}
            placeholder="Particular Name (e.g. Tea)"
            value={newParticularName}
            onChange={(e) => setNewParticularName(capitalizeWords(e.target.value))}
          />
          <input
            type="number"
            className="form-input"
            min="0"
            style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', flex: 1 }}
            placeholder="Rate (e.g. 15)"
            value={newParticularRate}
            onChange={(e) => setNewParticularRate(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddParticular(dbCompany);
              }
            }}
          />
          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center' }}
            onClick={() => handleAddParticular(dbCompany)}
          >
            Add
          </button>
        </div>
      </div>
    );
  };

  const renderTypesList = (dbCompany, hasTopBorder = false) => {
    const filtered = types.filter(t => 
      t.company.toLowerCase() === dbCompany.toLowerCase() ||
      t.company.replace(/\s+/g, '').toLowerCase() === dbCompany.replace(/\s+/g, '').toLowerCase()
    );
    return (
      <div className="types-manager-section" style={{ 
        paddingTop: '1rem', 
        borderTop: hasTopBorder ? '1px dashed var(--card-border)' : 'none', 
        marginTop: hasTopBorder ? '1rem' : '0' 
      }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.65rem' }}>
          Types ({filtered.length})
        </h4>
        
        {/* Chips list */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {filtered.length === 0 ? (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No configured types. Add one below!</span>
          ) : (
            filtered.map(t => (
              <span key={t.id} style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.3rem 0.6rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--card-border)',
                borderRadius: '20px',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)'
              }}>
                {t.type_name}
                <button
                  type="button"
                  onClick={() => handleDeleteType(t.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--error)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    padding: '0 2px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontWeight: 'bold'
                  }}
                  title="Remove Type"
                >
                  &times;
                </button>
              </span>
            ))
          )}
        </div>

        {/* Add Input */}
        <div style={{ display: 'flex', gap: '0.5rem', paddingLeft: '5px'}}>
          <input
            type="text"
            className="form-input capitalize"
            style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
            placeholder={`Add new type for ${dbCompany} (e.g. Loaders)`}
            value={newTypeName}
            onChange={(e) => setNewTypeName(capitalizeWords(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddType(dbCompany);
              }
            }}
          />
          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center' }}
            onClick={() => handleAddType(dbCompany)}
          >
            Add
          </button>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-card" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header" style={{ marginBottom: '0.5rem' }}>
          <h3>System Settings</h3>
          <button className="close-btn" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Tab Headers */}
        <div className="settings-tabs">
          <button
            className={`tab-btn ${activeTab === 'Tidy' ? 'active' : ''}`}
            onClick={() => setActiveTab('Tidy')}
          >
            Tidy
          </button>
          <button
            className={`tab-btn ${activeTab === 'AllCare' ? 'active' : ''}`}
            onClick={() => setActiveTab('AllCare')}
          >
            AllCare
          </button>
          <button
            className={`tab-btn ${activeTab === 'Elite' ? 'active' : ''}`}
            onClick={() => setActiveTab('Elite')}
          >
            Elite
          </button>
        </div>

        <div className="settings-body" style={{ flexGrow: 1 }}>
          {activeTab === 'Tidy' && (
            <div className="tab-content animated-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {renderPlacesList('Tidy')}

              {/* Address Manager Section for Tidy */}
              <div className="address-manager-section" style={{ paddingTop: '1rem', borderTop: '1px dashed var(--card-border)', marginTop: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.65rem' }}>
                  Client Address
                </h4>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>
                    Issued To Address
                  </label>
                  <textarea
                    className="address-textarea"
                    placeholder="Enter Issued To Address..."
                    value={customAddresses?.tidy?.client || ''}
                    onChange={(e) => {
                      const updated = {
                        ...customAddresses,
                        tidy: {
                          ...customAddresses.tidy,
                          client: e.target.value
                        }
                      };
                      onCustomAddressesChange(updated);
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'AllCare' && (
            <div className="tab-content animated-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {renderTypesList('All Care', false)}
              {renderPlacesList('All Care', true)}

              {/* Address Manager Section for AllCare */}
              <div className="address-manager-section" style={{ paddingTop: '1rem', borderTop: '1px dashed var(--card-border)', marginTop: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.65rem' }}>
                  Client Address
                </h4>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>
                    Billed To Address
                  </label>
                  <textarea
                    className="address-textarea"
                    placeholder="Enter Billed To Address..."
                    value={customAddresses?.allCare?.client || ''}
                    onChange={(e) => {
                      const updated = {
                        ...customAddresses,
                        allCare: {
                          ...customAddresses.allCare,
                          client: e.target.value
                        }
                      };
                      onCustomAddressesChange(updated);
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Elite' && (
            <div className="tab-content animated-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {renderPlacesList('Elite')}
              {renderParticularsList('Elite')}

              {/* Address Manager Section for Elite */}
              <div className="address-manager-section" style={{ paddingTop: '1rem', borderTop: '1px dashed var(--card-border)', marginTop: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.65rem' }}>
                  Client Addresses
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>
                      Billed To Address
                    </label>
                    <textarea
                      className="address-textarea"
                      placeholder="Enter Billed To Address..."
                      value={customAddresses?.elite?.billTo || ''}
                      onChange={(e) => {
                        const updated = {
                          ...customAddresses,
                          elite: {
                            ...customAddresses.elite,
                            billTo: e.target.value
                          }
                        };
                        onCustomAddressesChange(updated);
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>
                      Supply To Address
                    </label>
                    <textarea
                      className="address-textarea"
                      placeholder="Enter Supply To Address..."
                      value={customAddresses?.elite?.supplyTo || ''}
                      onChange={(e) => {
                        const updated = {
                          ...customAddresses,
                          elite: {
                            ...customAddresses.elite,
                            supplyTo: e.target.value
                          }
                        };
                        onCustomAddressesChange(updated);
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="settings-footer" style={{ marginTop: '0.5rem' }}>
          <button
            className="btn btn-primary"
            onClick={onSave || onClose}
            style={{ width: 'auto', padding: '0.6rem 1.5rem', fontSize: '0.9rem' }}
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}
