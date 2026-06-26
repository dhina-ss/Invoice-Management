import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function CustomSelect({ id, value, onChange, options, placeholder, icon, error, className, style, containerStyle }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current && !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Recalculate portal position whenever dropdown opens or window scrolls/resizes
  useEffect(() => {
    if (!isOpen) return;
    const calcPos = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
        zIndex: 99999,
      });
    };
    calcPos();
    window.addEventListener('scroll', calcPos, true);
    window.addEventListener('resize', calcPos);
    return () => {
      window.removeEventListener('scroll', calcPos, true);
      window.removeEventListener('resize', calcPos);
    };
  }, [isOpen]);

  const selectedOption = options.find(o => o.value === value);

  const dropdown = isOpen && (
    <div
      style={{
        ...dropdownStyle,
        backgroundColor: 'rgba(22, 22, 38, 0.98)',
        border: '1px solid var(--card-border)',
        borderRadius: 'var(--border-radius-md)',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
        overflowY: 'auto',
        maxHeight: '200px',
        padding: '4px',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
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
            onMouseDown={(e) => {
              e.preventDefault();
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
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              if (opt.value !== value) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = '#ffffff';
              }
            }}
            onMouseLeave={(e) => {
              if (opt.value !== value) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
          >
            {opt.label}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div ref={containerRef} className="custom-select-container" style={{ position: 'relative', width: '100%', ...containerStyle }}>
      <div
        id={id}
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`form-input ${icon ? 'form-input-with-icon' : ''} ${error ? 'error' : ''} ${className || ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          ...style,
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
            color: 'var(--text-muted)',
          }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {isOpen && createPortal(dropdown, document.body)}
    </div>
  );
}
