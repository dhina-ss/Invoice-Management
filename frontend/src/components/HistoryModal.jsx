import React, { useState, useEffect } from 'react';

export default function HistoryModal({ isOpen, onClose, onLoadBill, bills, loading, error, onDeleteBill }) {

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this invoice from history?')) {
      return;
    }
    const success = await onDeleteBill(id);
    if (!success) {
      alert('Failed to delete invoice.');
    }
  };

  // Helper to calculate grand total for display in table
  const calculateGrandTotal = (bill) => {
    const data = bill.data || {};
    const company = bill.company;

    if (company === 'Elite') {
      const items = data.eliteItems || [];
      return items.reduce((sum, item) => sum + (parseInt(item.qty, 10) || 0) * (parseFloat(item.rate) || 0), 0);
    } else if (company === 'All Care') {
      const items = data.eliteItems || [];
      const subtotal = items.reduce((sum, item) => sum + (parseInt(item.qty, 10) || 0) * (parseFloat(item.rate) || 0), 0);
      const charges = Math.round(subtotal * 0.10 * 100) / 100;
      return Math.round((subtotal + charges) * 100) / 100;
    } else {
      // Tidy
      const personnel = parseInt(data.noOfPersonal, 10) || 0;
      const rate = parseFloat(data.rate) || 0;
      const subtotal = personnel * rate;
      const cgstAmount = subtotal * 0.09;
      const sgstAmount = subtotal * 0.09;
      return Math.round(subtotal + cgstAmount + sgstAmount);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-card" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h3>Invoice History</h3>
          <button className="close-btn" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="settings-body" style={{ flexGrow: 1 }}>
          {loading && <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading history...</div>}
          {error && <div style={{ color: 'var(--error)', textAlign: 'center', padding: '1rem' }}>{error}</div>}
          
          {!loading && !error && bills.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No saved invoices found. Save some invoices to see them here!
            </div>
          )}

          {!loading && !error && bills.length > 0 && (
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Company</th>
                    <th>Date</th>
                    <th>Grand Total</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill) => {
                    const total = calculateGrandTotal(bill);
                    return (
                      <tr key={bill.id}>
                        <td>
                          <strong>{bill.invoiceNumber || `INV-${String(bill.id).padStart(4, '0')}`}</strong>
                        </td>
                        <td>
                          <span style={{ 
                            padding: '0.2rem 0.6rem', 
                            borderRadius: '20px', 
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            backgroundColor: bill.company === 'Elite' ? 'rgba(30, 41, 59, 0.4)' : bill.company === 'All Care' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                            color: bill.company === 'Elite' ? '#cbd5e1' : bill.company === 'All Care' ? '#34d399' : '#a78bfa',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                          }}>
                            {bill.company}
                          </span>
                        </td>
                        <td>{bill.billDate || '—'}</td>
                        <td>₹ {total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td>
                          <div className="action-cell">
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                onLoadBill(bill);
                                onClose();
                              }}
                            >
                              Load
                            </button>
                            <button 
                              className="btn btn-danger btn-sm"
                              onClick={(e) => handleDelete(bill.id, e)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
