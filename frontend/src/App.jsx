import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import BillForm from './components/BillForm';
import BillPreview from './components/BillPreview';
import SettingsModal from './components/SettingsModal';
import Dashboard from './components/Dashboard';

const DEFAULT_BILL = {
  id: '',
  company: 'All Care',
  place: '',
  designation: '',
  noOfPersonal: '',
  noOfDuties: '0',
  rate: '',
  billDate: new Date().toISOString().split('T')[0],
  fromDate: '',
  toDate: '',
  digitalSign: false,
  eliteSameParticularsRate: false,
  eliteItems: [{
    particulars: 'Loaders',
    qty: '',
    rate: ''
  }]
};

export default function App() {
  const [activeBill, setActiveBill] = useState(DEFAULT_BILL);
  const [formKey, setFormKey] = useState(0); // increments on each form reset to trigger invoice number re-fetch
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Hoisted visual state for digital signature printing/signing process
  const [signStatus, setSignStatus] = useState('idle');
  const [signError, setSignError] = useState('');

  // Ref to invoke handlePrint inside BillPreview from BillForm
  const printRef = useRef(null);

  const checkIsComplete = (bill) => {
    const isElite = bill.company === 'Elite';
    const isAllCare = bill.company === 'All Care';

    if (isElite || isAllCare) {
      return !!(
        bill.company?.trim() &&
        (isAllCare ? (bill.billDate?.trim() && bill.fromDate?.trim() && bill.toDate?.trim()) : true) &&
        bill.eliteItems &&
        bill.eliteItems.length > 0 &&
        bill.eliteItems.every(item =>
          (isElite ? item.date?.trim() : true) &&
          (item.particulars?.trim() || item.description?.trim()) &&
          item.qty !== undefined && item.qty !== null && String(item.qty).trim() !== '' && !isNaN(parseInt(item.qty, 10)) &&
          item.rate !== undefined && item.rate !== null && String(item.rate).trim() !== '' && !isNaN(parseFloat(item.rate))
        )
      );
    } else {
      return !!(
        bill.company?.trim() &&
        bill.place?.trim() &&
        bill.designation?.trim() &&
        bill.noOfPersonal?.trim() &&
        bill.noOfDuties?.trim() &&
        bill.rate?.trim() &&
        bill.billDate?.trim() &&
        bill.fromDate?.trim() &&
        bill.toDate?.trim()
      );
    }
  };

  const [customAddresses, setCustomAddresses] = useState({
    tidy: {
      client: 'M/S DTDC EXPRESS LIMITED,\n136, DIAMOND TOWER,\nA-20 TVK INDUSTRIAL ESTATE,\nGUINDY, CHENNAI-600032.',
      place: ''
    },
    allCare: {
      company: 'NO. 381/385, VENNU GOPAL LAYOUT, PN PALAYAM, PAPPANAICKENPALAYAM, COIMBATORE, TAMIL NADU \u2013 641037.\nPhone: +91 95005 95749',
      client: 'DTDC Express Limited,\nNo. 92, Parameshwaran Layout,\nPappanaickenpalayam,\nCoimbatore, Tamil Nadu - 641037'
    },
    elite: {
      company: 'No. 125, Annai Velakanni Nagar,\nSowripalayam, Coimbatore,\nTamilnadu - 641028.',
      clientSalem: 'DTDC Express Limited,\nNo. 12, Salem Main Road,\nSalem,\nTamil Nadu - 636001.',
      clientCoimbatore: 'DTDC Express Limited,\nNo. 396, Ponniyakadu Thottam,\nSengodagoundan Pudur, Salem-Kochi NH,\nSulur Pirivu, Coimbatore,\nTamil Nadu - 641037.',
      billTo: '',
      supplyTo: ''
    }
  });

  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [billsError, setBillsError] = useState('');
  const [settingsVersion, setSettingsVersion] = useState(0); // increments on every settings save to trigger BillForm refresh

  const navigate = useNavigate();
  const location = useLocation();

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const fetchBills = async () => {
    setBillsLoading(true);
    setBillsError('');
    try {
      const response = await fetch('/api/bills');
      if (response.ok) {
        const data = await response.json();
        setBills(data);
      } else {
        setBillsError('Could not load bill history.');
      }
    } catch (err) {
      console.error(err);
      setBillsError('Could not load bill history.');
    } finally {
      setBillsLoading(false);
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          if (data.customAddresses) {
            setCustomAddresses(data.customAddresses);
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    };
    loadSettings();
    fetchBills();
  }, []);

  useEffect(() => {
    const fetchInvoiceNumber = async () => {
      if (!activeBill.company || activeBill.id) return;
      try {
        const billYear = activeBill.billDate ? activeBill.billDate.split('-')[0].substring(2) : new Date().getFullYear().toString().substring(2);
        const response = await fetch(`/api/invoice-number?company=${encodeURIComponent(activeBill.company)}&advance=false&year=${billYear}`);
        if (response.ok) {
          const data = await response.json();
          setActiveBill(prev => {
            if (prev.id) return prev;
            return { ...prev, invoiceNumber: data.invoiceNumber };
          });
        }
      } catch (err) {
        console.error('Failed to fetch invoice number:', err);
      }
    };
    fetchInvoiceNumber();
  }, [activeBill.company, activeBill.id, activeBill.billDate, formKey]);

  useEffect(() => {
    if (isSettingsOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isSettingsOpen]);

  const handleFormChange = (updatedBill) => setActiveBill(updatedBill);

  const handleResetForm = (keepCompany = false) => {
    setFormKey(k => k + 1); // force invoice number re-fetch on next render
    setActiveBill(prev => ({
      ...DEFAULT_BILL,
      company: keepCompany === true ? prev.company : DEFAULT_BILL.company,
      billDate: new Date().toISOString().split('T')[0]
    }));
  };

  const handleSaveSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customAddresses })
      });
      if (response.ok) {
        setSettingsVersion(v => v + 1); // trigger BillForm to re-fetch places/particulars/types
        showToast('Settings saved successfully!');
      } else {
        alert('Failed to save settings.');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Error connecting to backend to save settings.');
    }
    setIsSettingsOpen(false);
    navigate(-1);
  };

  const handleSaveBill = async (autoClear = true) => {
    try {
      const isNew = !activeBill.id;
      let url = '/api/bills';
      let method = 'POST';

      if (!isNew) {
        url = `/api/bills/${activeBill.id}`;
        method = 'PUT';
      }

      let finalInvoiceNumber = activeBill.invoiceNumber;
      if (isNew) {
        const billYear = activeBill.billDate ? activeBill.billDate.split('-')[0].substring(2) : new Date().getFullYear().toString().substring(2);
        const invResp = await fetch(`/api/invoice-number?company=${encodeURIComponent(activeBill.company)}&advance=true&year=${billYear}`);
        if (invResp.ok) {
          const invData = await invResp.json();
          finalInvoiceNumber = invData.invoiceNumber;
        }
      } else if (finalInvoiceNumber) {
        const match = finalInvoiceNumber.match(/^(TDY|ELT|ALC)-(\d+)$/);
        if (match) {
          const prefix = match[1];
          const counter = parseInt(match[2], 10);
          const billYear = activeBill.billDate ? activeBill.billDate.split('-')[0].substring(2) : new Date().getFullYear().toString().substring(2);
          finalInvoiceNumber = `${prefix}${billYear}${String(counter).padStart(4, '0')}`;
        }
      }

      const payload = {
        invoiceNumber: finalInvoiceNumber,
        data: { ...activeBill, invoiceNumber: finalInvoiceNumber }
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const savedBill = await response.json();
        const updatedBill = { ...savedBill.data, id: savedBill.id, invoiceNumber: savedBill.invoiceNumber };
        if (autoClear) {
          handleResetForm(true);
        } else {
          setActiveBill(updatedBill);
        }
        fetchBills();
        showToast(isNew ? 'Invoice saved to history!' : 'Invoice updated in history!');
        return updatedBill;
      } else {
        alert('Failed to save invoice.');
        return null;
      }
    } catch (err) {
      console.error('Error saving invoice:', err);
      alert('Error connecting to backend to save invoice.');
      return null;
    }
  };

  const handleDeleteBill = async (id) => {
    try {
      const response = await fetch(`/api/bills/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setBills(prev => prev.filter(bill => bill.id !== id));
        return true;
      }
    } catch (err) {
      console.error('Error deleting bill:', err);
    }
    return false;
  };

  const handleUpdateBillStatus = async (id, currentStatus, tds = null, receivedAmount = null) => {
    const nextStatus = currentStatus === 'Received' ? 'Pending' : 'Received';
    try {
      const payload = { status: nextStatus };
      if (tds !== null) payload.tds = tds;
      if (receivedAmount !== null) payload.receivedAmount = receivedAmount;

      const response = await fetch(`/api/bills/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const updatedBill = await response.json();
        setBills(prev => prev.map(bill => bill.id === id ? { ...bill, status: updatedBill.status, data: updatedBill.data } : bill));
        showToast(`Invoice status updated to ${updatedBill.status}`);
        return true;
      }
    } catch (err) {
      console.error('Error updating bill status:', err);
    }
    return false;
  };

  // Load selected bill from history and navigate to /invoice
  const handleLoadBill = (bill) => {
    setActiveBill({ ...bill.data, id: bill.id, invoiceNumber: bill.invoiceNumber });
    showToast(`Loaded invoice ${bill.invoiceNumber || bill.id}`);
    navigate('/invoice');
  };

  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard';
  const isSettings = location.pathname === '/settings';
  const isInvoicePage = location.pathname === '/invoice';

  return (
    <div className={`app-container ${isInvoicePage ? 'invoice-page-active' : ''}`}>
      <main className="main-layout">
        <header className="header">
          <h1>Invoice Management</h1>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              className={`icon-btn ${isDashboard ? 'active' : ''}`}
              title="Dashboard"
              onClick={() => navigate('/dashboard')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9"></rect>
                <rect x="14" y="3" width="7" height="5"></rect>
                <rect x="14" y="12" width="7" height="9"></rect>
                <rect x="3" y="16" width="7" height="5"></rect>
              </svg>
            </button>
            <button
              className={`icon-btn ${location.pathname === '/invoice' ? 'active' : ''}`}
              title="Invoice Creator"
              onClick={() => navigate('/invoice')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </button>
            <button className={`icon-btn ${isSettings ? 'active' : ''}`} title="Settings" onClick={() => navigate('/settings')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
          </div>
        </header>

        <Routes>
          {/* Redirect root → /dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Dashboard */}
          <Route
            path="/dashboard"
            element={
              <div style={{ gridColumn: '1 / -1' }}>
                <Dashboard
                  bills={bills}
                  onLoadBill={handleLoadBill}
                  onViewChange={(view) => navigate(`/${view}`)}
                  onUpdateBillStatus={handleUpdateBillStatus}
                  onDeleteBill={handleDeleteBill}
                  customAddresses={customAddresses}
                />
              </div>
            }
          />

          {/* Invoice creator */}
          <Route
            path="/invoice"
            element={
              <>
                <section>
                  <BillForm
                    activeBill={activeBill}
                    onChange={handleFormChange}
                    onReset={handleResetForm}
                    settingsVersion={settingsVersion}
                    onSaveBill={handleSaveBill}
                    onPrint={() => printRef.current && printRef.current()}
                    isComplete={checkIsComplete(activeBill)}
                    signStatus={signStatus}
                    signError={signError}
                  />
                </section>
                <section>
                  <BillPreview
                    activeBill={activeBill}
                    customAddresses={customAddresses}
                    onSaveBill={handleSaveBill}
                    onResetForm={handleResetForm}
                    printRef={printRef}
                    signStatus={signStatus}
                    setSignStatus={setSignStatus}
                    signError={signError}
                    setSignError={setSignError}
                    isComplete={checkIsComplete(activeBill)}
                  />
                </section>
              </>
            }
          />

          {/* Settings */}
          <Route
            path="/settings"
            element={
              <div style={{ gridColumn: '1 / -1' }}>
                <SettingsModal
                  isOpen={true}
                  inline={true}
                  onClose={() => navigate(-1)}
                  onSave={handleSaveSettings}
                  customAddresses={customAddresses}
                  onCustomAddressesChange={setCustomAddresses}
                />
              </div>
            }
          />

          {/* Any unknown path → dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

      {toastMessage && (
        <div className="toast-notification">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
