import React, { useState, useEffect } from 'react';
import CustomSelect from './CustomSelect';

export default function BillForm({
  activeBill,
  onChange,
  onReset,
  settingsVersion,
  onSaveBill,
  onPrint,
  isComplete,
  signStatus,
  signError
}) {
  const [errors, setErrors] = useState({});
  const [places, setPlaces] = useState([]);
  const [particulars, setParticulars] = useState([]);
  const [types, setTypes] = useState([]);

  // Fetch places, particulars and types from DB dynamically on company change
  useEffect(() => {
    const fetchPlacesForCompany = async () => {
      if (!activeBill.company) {
        setPlaces([]);
        return;
      }
      try {
        const response = await fetch(`/api/places?company=${encodeURIComponent(activeBill.company)}`);
        if (response.ok) {
          const data = await response.json();
          setPlaces(data);
        }
      } catch (err) {
        console.error('Failed to fetch places for company:', err);
      }
    };

    const fetchParticularsForCompany = async () => {
      if (!activeBill.company) {
        setParticulars([]);
        return;
      }
      try {
        const response = await fetch(`/api/particulars?company=${encodeURIComponent(activeBill.company)}`);
        if (response.ok) {
          const data = await response.json();
          setParticulars(data);
        }
      } catch (err) {
        console.error('Failed to fetch particulars for company:', err);
      }
    };

    const fetchTypesForCompany = async () => {
      if (!activeBill.company) {
        setTypes([]);
        return;
      }
      try {
        const response = await fetch(`/api/types?company=${encodeURIComponent(activeBill.company)}`);
        if (response.ok) {
          const data = await response.json();
          setTypes(data);
        }
      } catch (err) {
        console.error('Failed to fetch types for company:', err);
      }
    };

    fetchPlacesForCompany();
    fetchParticularsForCompany();
    fetchTypesForCompany();
  }, [activeBill.company, settingsVersion]);
  const isElite = activeBill.company === 'Elite';
  const isAllCare = activeBill.company === 'All Care';

  // Prevent scroll wheel from changing number inputs
  useEffect(() => {
    const handleWheel = (e) => {
      if (document.activeElement && document.activeElement.type === 'number') {
        document.activeElement.blur();
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Trigger form update when activeBill changes from outside (e.g., clicking on history)
  const handleChange = (field, val) => {
    const updatedBill = { ...activeBill, [field]: val };

    // Clear validation error when field is typed in
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }

    onChange(updatedBill);
  };

  const handleCompanyChange = (companyValue) => {
    let updatedBill = {
      ...activeBill,
      company: companyValue,
      digitalSign: companyValue === 'Tidy' ? (activeBill.digitalSign || false) : false,
      designation: '',
      rate: '',
      noOfDuties: (companyValue === 'Elite' || companyValue === 'All Care') ? '0' : '',
      noOfPersonal: '',
      fromDate: '',
      toDate: '',
      billDate: new Date().toISOString().split('T')[0],
      place: '',
      eliteSameParticularsRate: companyValue === 'Elite',
      eliteItems: companyValue === 'Elite' ? [{
        date: new Date().toISOString().split('T')[0],
        particulars: 'TEA',
        qty: '',
        rate: '10'
      }] : (companyValue === 'All Care' ? [{
        particulars: 'Loaders',
        qty: '',
        rate: ''
      }] : [])
    };

    if (errors.company) {
      setErrors({ ...errors, company: '' });
    }

    onChange(updatedBill);
  };

  const handleToggleSameParticularsRate = (checked) => {
    const updatedBill = { ...activeBill, eliteSameParticularsRate: checked };
    if (checked && updatedBill.eliteItems && updatedBill.eliteItems.length > 0) {
      // Sync all items to the first item's particulars and rate
      const firstItem = updatedBill.eliteItems[0];
      updatedBill.eliteItems = updatedBill.eliteItems.map((item, idx) => {
        if (idx === 0) return item;
        return {
          ...item,
          particulars: firstItem.particulars,
          rate: firstItem.rate
        };
      });
    }
    onChange(updatedBill);
  };

  const handleEliteItemChange = (index, field, value) => {
    const updatedItems = [...(activeBill.eliteItems || [])];

    if (isElite && field === 'particulars') {
      const selectedPart = particulars.find(p => p.particular_name.toUpperCase() === String(value).toUpperCase());
      let autoRate = selectedPart ? String(selectedPart.rate) : updatedItems[index].rate;
      updatedItems[index] = {
        ...updatedItems[index],
        particulars: value,
        rate: autoRate
      };
    } else if (isAllCare && field === 'particulars') {
      updatedItems[index] = {
        ...updatedItems[index],
        particulars: value,
        place: '',
        rate: ''
      };
    } else {
      updatedItems[index] = { ...updatedItems[index], [field]: value };
    }

    // If same particulars/rate is enabled, and we edit the first item's particulars or rate
    const sameProp = activeBill.eliteSameParticularsRate !== false; // defaults to true
    if (sameProp && index === 0 && (field === 'particulars' || field === 'rate')) {
      for (let i = 1; i < updatedItems.length; i++) {
        if (field === 'particulars') {
          updatedItems[i].particulars = updatedItems[0].particulars;
          updatedItems[i].rate = updatedItems[0].rate;
        } else {
          updatedItems[i][field] = value;
        }
      }
    }

    // Recalculate sum of quantities
    const totalDuties = updatedItems.reduce((sum, item) => sum + (parseInt(item.qty, 10) || 0), 0);
    const updatedBill = {
      ...activeBill,
      eliteItems: updatedItems,
      noOfDuties: String(totalDuties)
    };
    onChange(updatedBill);
  };

  const handleAllCarePlaceChange = (index, placeVal) => {
    const updatedItems = [...(activeBill.eliteItems || [])];
    const item = updatedItems[index];
    
    // Find the configured rate for this type + place combination
    const configuredPlace = places.find(p => 
      p.place_name.toLowerCase() === String(placeVal).toLowerCase() &&
      p.type_name && p.type_name.toLowerCase() === String(item.particulars || '').toLowerCase()
    );
    const autoRate = configuredPlace ? String(configuredPlace.rate) : item.rate;

    updatedItems[index] = {
      ...item,
      place: placeVal,
      rate: autoRate
    };

    const totalDuties = updatedItems.reduce((sum, item) => sum + (parseInt(item.qty, 10) || 0), 0);
    const updatedBill = {
      ...activeBill,
      eliteItems: updatedItems,
      noOfDuties: String(totalDuties)
    };
    onChange(updatedBill);
  };

  const handleAddEliteItem = () => {
    const updatedItems = [...(activeBill.eliteItems || [])];

    if (isAllCare) {
      // AllCare: Description/Qty/Price - no date
      const firstType = types[0] || { type_name: 'Loaders' };
      updatedItems.push({
        particulars: firstType.type_name,
        qty: '',
        rate: ''
      });
    } else {
      // Elite: Date/Particulars/Qty/Rate
      let nextDate = '';
      if (updatedItems.length > 0) {
        const lastItemDate = new Date(updatedItems[updatedItems.length - 1].date);
        if (!isNaN(lastItemDate)) {
          lastItemDate.setDate(lastItemDate.getDate() + 1);
          nextDate = lastItemDate.toISOString().split('T')[0];
        }
      }
      if (!nextDate) {
        nextDate = new Date().toISOString().split('T')[0];
      }

      const firstParticular = particulars[0] || { particular_name: 'TEA', rate: 10 };
      const sameProp = activeBill.eliteSameParticularsRate !== false;
      const firstItem = updatedItems[0] || { particulars: firstParticular.particular_name, rate: String(firstParticular.rate) };

      updatedItems.push({
        date: nextDate,
        particulars: sameProp ? firstItem.particulars : firstParticular.particular_name,
        qty: '',
        rate: sameProp ? firstItem.rate : String(firstParticular.rate)
      });
    }

    const totalDuties = updatedItems.reduce((sum, item) => sum + (parseInt(item.qty, 10) || 0), 0);
    const updatedBill = {
      ...activeBill,
      eliteItems: updatedItems,
      noOfDuties: String(totalDuties)
    };
    onChange(updatedBill);
  };

  const handleRemoveEliteItem = (index) => {
    const updatedItems = [...(activeBill.eliteItems || [])];
    updatedItems.splice(index, 1);

    const totalDuties = updatedItems.reduce((sum, item) => sum + (parseInt(item.qty, 10) || 0), 0);
    const updatedBill = {
      ...activeBill,
      eliteItems: updatedItems,
      noOfDuties: String(totalDuties)
    };
    onChange(updatedBill);
  };

  const validate = () => {
    const newErrors = {};
    if (!activeBill.company || !activeBill.company.trim()) {
      newErrors.company = 'Company is required';
    }

    if (!activeBill.place || !activeBill.place.trim()) {
      newErrors.place = 'Place/Location is required';
    }

    const personnel = parseInt(activeBill.noOfPersonal, 10);
    if (!activeBill.noOfPersonal || isNaN(personnel) || personnel <= 0) {
      newErrors.noOfPersonal = 'Must be at least 1 person';
    }

    const duties = parseInt(activeBill.noOfDuties, 10);
    if (!activeBill.noOfDuties || isNaN(duties) || duties <= 0) {
      newErrors.noOfDuties = 'Must be at least 1 duty';
    }

    if (!activeBill.billDate) {
      newErrors.billDate = 'Bill date is required';
    }

    const rate = parseFloat(activeBill.rate);
    if (!activeBill.rate || isNaN(rate) || rate < 0) {
      newErrors.rate = 'Rate must be positive';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <div className="glass-card animated-fade-in" style={{ padding: '2rem', maxHeight: 'calc(100vh - 10rem)' }}>
      <h2 className="form-title">Deployment Invoice Details</h2>
      <form onSubmit={handleSubmit} className="bill-form" noValidate>
        {/* Company Input */}
        <div className="form-group">
          <label className="form-label" htmlFor="company">
            Company
          </label>
          <div className="input-wrapper">
            <span className="input-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18"></path>
                <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16"></path>
                <path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"></path>
                <path d="M9 7h2v2H9V7zm4 0h2v2h-2V7zm-4 4h2v2H9v-2zm4 0h2v2h-2v-2z"></path>
              </svg>
            </span>
            <CustomSelect
              id="company"
              value={activeBill.company || ''}
              onChange={handleCompanyChange}
              options={[
                { value: 'All Care', label: 'All Care' },
                { value: 'Elite', label: 'Elite' },
                { value: 'Tidy', label: 'Tidy' }
              ]}
              placeholder="Select Company"
              icon={true}
              error={errors.company}
            />
          </div>
          {errors.company && <div className="error-message">{errors.company}</div>}
        </div>

        {isAllCare && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
              {/* Date */}
              <div className="form-group">
                <label className="form-label" htmlFor="billDate">
                  Date
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </span>
                  <input
                    id="billDate"
                    type="date"
                    lang="en-GB"
                    className={`form-input form-input-with-icon ${errors.billDate ? 'error' : ''}`}
                    value={activeBill.billDate || ''}
                    onChange={(e) => handleChange('billDate', e.target.value)}
                  />
                </div>
                {errors.billDate && <div className="error-message">{errors.billDate}</div>}
              </div>
            </div>

            {/* Date Range Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="fromDate">
                  From Date
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </span>
                  <input
                    id="fromDate"
                    type="date"
                    lang="en-GB"
                    className={`form-input form-input-with-icon ${errors.fromDate ? 'error' : ''}`}
                    value={activeBill.fromDate || ''}
                    onChange={(e) => handleChange('fromDate', e.target.value)}
                  />
                </div>
                {errors.fromDate && <div className="error-message">{errors.fromDate}</div>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="toDate">
                  To Date
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </span>
                  <input
                    id="toDate"
                    type="date"
                    lang="en-GB"
                    className={`form-input form-input-with-icon ${errors.toDate ? 'error' : ''}`}
                    value={activeBill.toDate || ''}
                    onChange={(e) => handleChange('toDate', e.target.value)}
                  />
                </div>
                {errors.toDate && <div className="error-message">{errors.toDate}</div>}
              </div>
            </div>
          </>
        )}

        {isElite && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            {/* Place Input */}
            <div className="form-group">
              <label className="form-label" htmlFor="place">
                Place
              </label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </span>
                <CustomSelect
                  id="place"
                  value={activeBill.place}
                  onChange={(val) => handleChange('place', val)}
                  options={places.map(p => ({ value: p.place_name, label: p.place_name }))}
                  placeholder="Select Place"
                  icon={true}
                  error={errors.place}
                />
              </div>
              {errors.place && <div className="error-message">{errors.place}</div>}
            </div>

            {/* Bill Date Input */}
            <div className="form-group">
              <label className="form-label" htmlFor="billDate">
                Invoice Date
              </label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </span>
                <input
                  id="billDate"
                  type="date"
                  lang="en-GB"
                  className="form-input form-input-with-icon"
                  value={activeBill.billDate || ''}
                  onChange={(e) => handleChange('billDate', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {!isElite && !isAllCare && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Place Input */}
              <div className="form-group">
                <label className="form-label" htmlFor="place">
                  Place
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                  </span>
                  <CustomSelect
                    id="place"
                    value={activeBill.place}
                    onChange={(val) => handleChange('place', val)}
                    options={places.map(p => ({ value: p.place_name, label: p.place_name }))}
                    placeholder="Select Place"
                    icon={true}
                    error={errors.place}
                  />
                </div>
                {errors.place && <div className="error-message">{errors.place}</div>}
              </div>

              {/* Designation */}
              <div className="form-group">
                <label className="form-label" htmlFor="designation">
                  Designation
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                      <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                  </span>
                  <input
                    id="designation"
                    type="text"
                    className={`form-input form-input-with-icon ${errors.designation ? 'error' : ''}`}
                    placeholder="e.g. Brand consultation"
                    value={activeBill.designation}
                    onChange={(e) => handleChange('designation', e.target.value)}
                  />
                </div>
                {errors.designation && <div className="error-message">{errors.designation}</div>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* From Date */}
              <div className="form-group">
                <label className="form-label" htmlFor="fromDate">
                  From Date
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </span>
                  <input
                    id="fromDate"
                    type="date"
                    lang="en-GB"
                    className={`form-input form-input-with-icon ${errors.fromDate ? 'error' : ''}`}
                    value={activeBill.fromDate}
                    onChange={(e) => handleChange('fromDate', e.target.value)}
                  />
                </div>
                {errors.fromDate && <div className="error-message">{errors.fromDate}</div>}
              </div>

              {/* To Date */}
              <div className="form-group">
                <label className="form-label" htmlFor="toDate">
                  To Date
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </span>
                  <input
                    id="toDate"
                    type="date"
                    lang="en-GB"
                    className={`form-input form-input-with-icon ${errors.toDate ? 'error' : ''}`}
                    value={activeBill.toDate}
                    onChange={(e) => handleChange('toDate', e.target.value)}
                  />
                </div>
                {errors.toDate && <div className="error-message">{errors.toDate}</div>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Bill Date */}
              <div className="form-group">
                <label className="form-label" htmlFor="billDate">
                  Bill Date
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </span>
                  <input
                    id="billDate"
                    type="date"
                    lang="en-GB"
                    className={`form-input form-input-with-icon ${errors.billDate ? 'error' : ''}`}
                    value={activeBill.billDate}
                    onChange={(e) => handleChange('billDate', e.target.value)}
                  />
                </div>
                {errors.billDate && <div className="error-message">{errors.billDate}</div>}
              </div>

              {/* Rate per Duty */}
              <div className="form-group">
                <label className="form-label" htmlFor="rate">
                  Pay Rate
                </label>
                <div className="input-wrapper">
                  <span className="input-icon" style={{ fontSize: '1.1rem', fontWeight: '500' }}>
                    ₹
                  </span>
                  <input
                    id="rate"
                    type="number"
                    min="0"
                    step="any"
                    className={`form-input form-input-with-icon ${errors.rate ? 'error' : ''}`}
                    placeholder="e.g. 500"
                    value={activeBill.rate}
                    onChange={(e) => handleChange('rate', e.target.value)}
                  />
                </div>
                {errors.rate && <div className="error-message">{errors.rate}</div>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Number of Personnel */}
              <div className="form-group">
                <label className="form-label" htmlFor="noOfPersonal">
                  No of Personnel
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </span>
                  <input
                    id="noOfPersonal"
                    type="number"
                    min="1"
                    className={`form-input form-input-with-icon ${errors.noOfPersonal ? 'error' : ''}`}
                    placeholder="e.g. 5"
                    value={activeBill.noOfPersonal}
                    onChange={(e) => handleChange('noOfPersonal', e.target.value)}
                  />
                </div>
                {errors.noOfPersonal && <div className="error-message">{errors.noOfPersonal}</div>}
              </div>

              {/* Number of Duties */}
              <div className="form-group">
                <label className="form-label" htmlFor="noOfDuties">
                  No of Duties
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </span>
                  <input
                    id="noOfDuties"
                    type="number"
                    min="1"
                    className={`form-input form-input-with-icon ${errors.noOfDuties ? 'error' : ''}`}
                    placeholder="e.g. 12"
                    value={activeBill.noOfDuties}
                    onChange={(e) => handleChange('noOfDuties', e.target.value)}
                  />
                </div>
                {errors.noOfDuties && <div className="error-message">{errors.noOfDuties}</div>}
              </div>
            </div>
          </>
        )}

        {(isElite || isAllCare) && (
          <div className="elite-items-section" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
            <h3 className="section-subtitle" style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Invoice Items</h3>

            {/* Toggle Same Particulars & Rate - Elite only */}
            {isElite && (
            <div className="form-group" style={{ marginTop: '0.25rem', marginBottom: '0.5rem' }}>
              <div className="switch-group">
                <div className="switch-label-wrapper">
                  <span className="switch-title">Same Particulars & Rate</span>
                  <span className="switch-desc">Particulars and rate/unit are identical for all rows</span>
                </div>
                <label className="switch-control">
                  <input
                    id="eliteSameParticularsRate"
                    type="checkbox"
                    checked={activeBill.eliteSameParticularsRate !== false}
                    onChange={(e) => handleToggleSameParticularsRate(e.target.checked)}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>
            </div>
            )}

            {/* Global inputs when same particulars & rate is checked - Elite only */}
            {isElite && activeBill.eliteSameParticularsRate !== false && activeBill.eliteItems && activeBill.eliteItems.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '1rem', background: 'rgba(255,255,255,0.01)', borderRadius: 'var(--border-radius-md)', border: '1px dashed var(--card-border)', marginBottom: '0.5rem' }}>
                {/* Particulars */}
                <div className="form-group" style={{ gap: '0.25rem' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Particulars</label>
                  <CustomSelect
                    value={activeBill.eliteItems[0].particulars || ''}
                    onChange={(val) => handleEliteItemChange(0, 'particulars', val)}
                    options={particulars.map(p => ({ value: p.particular_name, label: p.particular_name }))}
                    placeholder="Select Particulars"
                    style={{ padding: '0.6rem 0.8rem', background: 'rgba(10, 10, 15, 0.9)' }}
                  />
                </div>

                {/* Rate/Unit */}
                <div className="form-group" style={{ gap: '0.25rem' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Rate/Unit</label>
                  <input
                    type="number"
                    className="form-input"
                    style={{ padding: '0.6rem 0.8rem' }}
                    placeholder="0"
                    value={activeBill.eliteItems[0].rate || ''}
                    onChange={(e) => handleEliteItemChange(0, 'rate', e.target.value)}
                  />
                </div>
              </div>
            )}

            {(activeBill.eliteItems || []).map((item, index) => {
              const showAllFields = isAllCare || activeBill.eliteSameParticularsRate === false;
              return (
                <div key={index} className="elite-item-group-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--card-border)', position: 'relative' }}>

                  {/* Header / Delete button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Item #{index + 1}</span>
                    {activeBill.eliteItems.length > 1 && (
                      <button
                        type="button"
                        style={{
                          padding: '4px',
                          borderRadius: 'var(--border-radius-sm)',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          color: 'var(--error)',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'var(--transition-fast)'
                        }}
                        onClick={() => handleRemoveEliteItem(index)}
                        title="Remove Item"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    )}
                  </div>

                  {isAllCare ? (
                    <>
                      {/* AllCare: Description/Type and Place */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div className="form-group" style={{ gap: '0.25rem' }}>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>Description/Type</label>
                          <CustomSelect
                            value={item.particulars || ''}
                            onChange={(val) => handleEliteItemChange(index, 'particulars', val)}
                            options={types.map(t => ({ value: t.type_name, label: t.type_name }))}
                            placeholder="Select Type"
                            style={{ padding: '0.6rem 0.8rem', background: 'rgba(10, 10, 15, 0.9)' }}
                          />
                        </div>
                        <div className="form-group" style={{ gap: '0.25rem' }}>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>Place</label>
                          <CustomSelect
                            value={item.place || ''}
                            onChange={(val) => handleAllCarePlaceChange(index, val)}
                            options={places
                              .filter(p => p.type_name && p.type_name.toLowerCase() === String(item.particulars || '').toLowerCase())
                              .map(p => ({ value: p.place_name, label: p.place_name }))
                            }
                            placeholder="Select Place"
                            style={{ padding: '0.6rem 0.8rem', background: 'rgba(10, 10, 15, 0.9)' }}
                          />
                        </div>
                      </div>

                      {/* Qty and Price */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div className="form-group" style={{ gap: '0.25rem' }}>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>Qty</label>
                          <input
                            type="number"
                            className="form-input"
                            style={{ padding: '0.6rem 0.8rem' }}
                            placeholder="0"
                            value={item.qty || ''}
                            onChange={(e) => handleEliteItemChange(index, 'qty', e.target.value)}
                          />
                        </div>
                        <div className="form-group" style={{ gap: '0.25rem' }}>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>Price</label>
                          <input
                            type="number"
                            className="form-input"
                            style={{ padding: '0.6rem 0.8rem' }}
                            placeholder="0"
                            value={item.rate || ''}
                            onChange={(e) => handleEliteItemChange(index, 'rate', e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  ) : showAllFields ? (
                    <>
                      {/* Elite: Date and Particulars */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div className="form-group" style={{ gap: '0.25rem' }}>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>Date</label>
                          <input
                            type="date"
                            lang="en-GB"
                            className="form-input"
                            style={{ padding: '0.6rem 0.8rem' }}
                            value={item.date || ''}
                            onChange={(e) => handleEliteItemChange(index, 'date', e.target.value)}
                          />
                        </div>
                        <div className="form-group" style={{ gap: '0.25rem' }}>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>Particulars</label>
                          <CustomSelect
                            value={item.particulars || ''}
                            onChange={(val) => handleEliteItemChange(index, 'particulars', val)}
                            options={particulars.map(p => ({ value: p.particular_name, label: p.particular_name }))}
                            placeholder="Select Particulars"
                            style={{ padding: '0.6rem 0.8rem', background: 'rgba(10, 10, 15, 0.9)' }}
                          />
                        </div>
                      </div>

                      {/* Qty and Rate/Unit */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div className="form-group" style={{ gap: '0.25rem' }}>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>Qty</label>
                          <input
                            type="number"
                            className="form-input"
                            style={{ padding: '0.6rem 0.8rem' }}
                            placeholder="0"
                            value={item.qty || ''}
                            onChange={(e) => handleEliteItemChange(index, 'qty', e.target.value)}
                          />
                        </div>
                        <div className="form-group" style={{ gap: '0.25rem' }}>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>Rate/Unit</label>
                          <input
                            type="number"
                            className="form-input"
                            style={{ padding: '0.6rem 0.8rem' }}
                            placeholder="0"
                            value={item.rate || ''}
                            onChange={(e) => handleEliteItemChange(index, 'rate', e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Elite: Only Date and Qty (same particulars mode) */
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group" style={{ gap: '0.25rem' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Date</label>
                        <input
                          type="date"
                          lang="en-GB"
                          className="form-input"
                          style={{ padding: '0.6rem 0.8rem' }}
                          value={item.date || ''}
                          onChange={(e) => handleEliteItemChange(index, 'date', e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ gap: '0.25rem' }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Qty</label>
                        <input
                          type="number"
                          className="form-input"
                          style={{ padding: '0.6rem 0.8rem' }}
                          placeholder="0"
                          value={item.qty || ''}
                          onChange={(e) => handleEliteItemChange(index, 'qty', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add New Button */}
            <button
              type="button"
              className="btn btn-secondary"
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', padding: '0.6rem', background: 'rgba(139, 92, 246, 0.05)', borderColor: 'rgba(139, 92, 246, 0.2)', color: 'var(--primary)' }}
              onClick={handleAddEliteItem}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
              Add New
            </button>
          </div>
        )}

        {/* Toggle Digital Signature (Only for Tidy) */}
        {activeBill.company === 'Tidy' && (
          <div className="form-group" style={{ marginTop: '0.5rem' }}>
            <div className="switch-group">
              <div className="switch-label-wrapper">
                <span className="switch-title">Digital Signature</span>
                <span className="switch-desc">Apply authenticated signature to invoice</span>
              </div>
              <label className="switch-control">
                <input
                  id="digitalSign"
                  type="checkbox"
                  checked={activeBill.digitalSign || false}
                  onChange={(e) => handleChange('digitalSign', e.target.checked)}
                />
                <span className="switch-slider"></span>
              </label>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', marginBottom: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onSaveBill}
            disabled={!isComplete}
            title={!isComplete ? 'Please fill all form fields to save the bill' : 'Save Invoice'}
            style={{ flex: 1 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            <span style={{ verticalAlign: 'middle' }}>{activeBill.id ? 'Update Invoice' : 'Save Invoice'}</span>
          </button>
          <button
            type="button"
            id="tidy-download-btn"
            className="btn btn-primary"
            onClick={onPrint}
            disabled={!isComplete || signStatus === 'capturing' || signStatus === 'signing'}
            title={
              !isComplete
                ? 'Please fill all form fields'
                : (activeBill.company === 'Tidy' && activeBill.digitalSign)
                  ? 'Generate PDF, sign with USB token, and download'
                  : 'Print Bill (PDF)'
            }
            style={{
              flex: 1,
              ...(activeBill.company === 'Tidy' && activeBill.digitalSign && {
                background: signStatus === 'done'
                  ? 'linear-gradient(135deg, #059669, #047857)'
                  : signStatus === 'error'
                    ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
                    : 'linear-gradient(135deg, #0d3b66, #1e5fa0)',
                opacity: (signStatus === 'capturing' || signStatus === 'signing') ? 0.7 : 1,
              }),
            }}
          >
            {activeBill.company === 'Tidy' && activeBill.digitalSign ? (
              signStatus === 'capturing' ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ animation: 'spin 1s linear infinite', marginRight: '8px', verticalAlign: 'middle' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <span style={{ verticalAlign: 'middle' }}>Generating PDF…</span>
                </>
              ) : signStatus === 'signing' ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{ animation: 'spin 1s linear infinite', marginRight: '8px', verticalAlign: 'middle' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <span style={{ verticalAlign: 'middle' }}>Signing…</span>
                </>
              ) : signStatus === 'done' ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span style={{ verticalAlign: 'middle' }}>Signed &amp; Downloaded!</span>
                </>
              ) : signStatus === 'error' ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  <span style={{ verticalAlign: 'middle' }}>Signing Failed — Retry</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                  <span style={{ verticalAlign: 'middle' }}>Sign PDF &amp; Download</span>
                </>
              )
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                <span style={{ verticalAlign: 'middle' }}>Print Bill (PDF)</span>
              </>
            )}
          </button>
        </div>

        {activeBill.company === 'Tidy' && activeBill.digitalSign && signError && (
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.78rem', color: '#dc2626', textAlign: 'center' }}>
            ⚠ {signError}
          </p>
        )}

        {activeBill.company === 'Tidy' && activeBill.digitalSign && signStatus === 'idle' && (
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.72rem', color: '#64748b', textAlign: 'center' }}>
            🔐 Digital Signature is ON — clicking Download will auto-sign with your USB token
          </p>
        )}

        <div style={{ marginTop: '0.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onReset} style={{ width: '100%' }}>
            Clear Form
          </button>
        </div>
      </form>
    </div>
  );
}
