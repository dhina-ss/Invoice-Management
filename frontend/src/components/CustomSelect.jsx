import React, { useState, useEffect, useRef } from 'react';

export default function CustomSelect({ id, value, onChange, options, placeholder, icon, error, className, style, containerStyle }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div ref={containerRef} className="custom-select-container" style={{ position: 'relative', width: '100%', ...containerStyle }}>
      <div
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        className={`form-input ${icon ? 'form-input-with-icon' : ''} ${error ? 'error' : ''} ${className || ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          ...style
        }}
      >
        <span>{selectedOption ? selectedOption.label : placeholder || 'Select option'}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            color: 'var(--text-muted)'
          }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {isOpen && (
        <div
          className="custom-select-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            backgroundColor: 'rgba(22, 22, 38, 0.98)',
            border: '1px solid var(--card-border)',
            borderRadius: 'var(--border-radius-md)',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
            zIndex: 100,
            overflowY: 'auto',
            maxHeight: '200px',
            padding: '4px',
            backdropFilter: 'blur(12px)',
            webkitBackdropFilter: 'blur(12px)'
          }}
        >
          {options.length === 0 ? (
            <div style={{ padding: '0.6rem 0.8rem', fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'left' }}>
              No options available
            </div>
          ) : (
            options.map((opt) => (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                style={{
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  color: opt.value === value ? '#ffffff' : 'var(--text-secondary)',
                  backgroundColor: opt.value === value ? 'var(--primary)' : 'transparent',
                  transition: 'all 0.15s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  if (opt.value !== value) {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    e.target.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (opt.value !== value) {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
