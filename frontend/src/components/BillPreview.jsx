import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import tidyLogo from '../assets/TIDY (2).png';
import eliteLogo from '../assets/Elite.png';
import allCareLogo from '../assets/AllCare (2).png';

const COMPANIES = {
  Tidy: {
    name: 'TIDY CORPORATE SERVICES AND SAFETY EQUIPMENT',
    shortName: 'TIDY',
    gst: '33DSHPA5970H2ZR',
    pan: 'DSHPA5970H',
    bankName: 'State Bank of India',
    accountNo: '0123 4567 8901',
    ifsc: 'SBIN0000000',
    color: '#0d3b66', // Deep blue
    logoType: 'image',
    logoSrc: tidyLogo
  },
  'All Care': {
    name: 'ALLCARE MANAGEMENT SERVICES',
    shortName: 'ALL CARE',
    gst: '',
    pan: 'ACGFA6590H',
    address: 'No. 381/385, Vennu Gopal Layout, PN Palayam, Pappanaickenpalayam, Coimbatore,',
    bankName: 'State Bank of India',
    accountNo: '0123 4567 8901',
    ifsc: 'SBIN0000000',
    color: '#059669', // Emerald Green
    logoType: 'image',
    logoSrc: allCareLogo
  },
  Elite: {
    name: 'ELITE MANAGEMENT SERVICES',
    shortName: 'ELITE',
    gst: '', // No GST shown on Elite header
    pan: 'AEOPE7595L',
    phone: '+91 7598285992',
    email: 'elite7595management@gmail.com',
    address: 'No. 125, Annai Velakanni Nagar, Sowripalayam, Coimbatore, Tamilnadu - 641028.',
    bankName: 'ICICI Bank',
    accountNo: '5555 4444 3333',
    ifsc: 'ICIC0000456',
    color: '#1e293b', // Slate gray theme
    logoType: 'image',
    logoSrc: eliteLogo
  }
};

const numberToWords = (num) => {
  if (num === 0) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const inWords = (n) => {
    let str = '';
    if (n > 99999) {
      str += inWords(Math.floor(n / 100000)) + ' Lakhs ';
      n %= 100000;
    }
    if (n > 999) {
      str += inWords(Math.floor(n / 1000)) + ' Thousand ';
      n %= 1000;
    }
    if (n > 99) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (str !== '') str += 'and ';
      if (n < 20) str += a[n];
      else {
        str += b[Math.floor(n / 10)];
        if (n % 10 > 0) str += ' ' + a[n % 10];
      }
    }
    return str.trim();
  };
  return inWords(num) + ' only';
};

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || amount === '') return '';
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};

export default function BillPreview({
  activeBill,
  customAddresses,
  onSaveBill,
  onResetForm,
  printRef,
  signStatus,
  setSignStatus,
  signError,
  setSignError,
  isComplete
}) {
  const { company: companyName, place, designation, noOfPersonal, noOfDuties, billDate, rate, fromDate, toDate, digitalSign, invoiceNumber } = activeBill;

  const selectedCompanyName = companyName || 'Tidy';
  const company = COMPANIES[selectedCompanyName] || COMPANIES.Tidy;

  const isElite = company.shortName === 'ELITE';
  const isAllCare = company.shortName === 'ALL CARE';
  const isTidy = company.shortName === 'TIDY';

  // ── Refs ────────────────────────────────────────────────────────────
  const tidyInvoiceRef = useRef(null); // wraps the printable Tidy invoice card
  const tidySigAreaRef = useRef(null); // wraps the signature placeholder area

  // Register the handlePrint function in printRef on every render to ensure latest closures
  useEffect(() => {
    if (printRef) {
      printRef.current = handlePrint;
    }
    return () => {
      if (printRef) printRef.current = null;
    };
  });

  const displayPlace = place ? place.trim() : 'SALEM';
  const parsedDate = billDate ? new Date(billDate) : new Date();

  const displayMonth = parsedDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const displayDate = `${String(parsedDate.getDate()).padStart(2, '0')}-${displayMonth}-${parsedDate.getFullYear()}`;

  const formatDateDDMMYYYY = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  };

  const displayFromDate = formatDateDDMMYYYY(fromDate);
  const displayToDate = formatDateDDMMYYYY(toDate);

  const numPersonnel = parseInt(noOfPersonal, 10) || 0;
  const numDuties = parseInt(noOfDuties, 10) || 0;
  const dutyRate = parseFloat(rate) || 0;

  const subtotal = numPersonnel * dutyRate;

  // Tax distribution
  const cgst = subtotal > 0 ? 100 : 0; // Using exact values from PDF or calculating based on tax?
  // Wait, the PDF had Total 100, CGST 100, SGST 100 -> Grand Total 700? No, 100+100+100=300? 
  // Let's just calculate 9% CGST and 9% SGST to be realistic, or hardcode it.
  // Actually, standard is 9% + 9% = 18% GST. Let's use 9% for CGST and SGST.
  const taxRate = 0.09;
  const cgstAmount = subtotal * taxRate;
  const sgstAmount = subtotal * taxRate;
  const grandTotal = Math.round(subtotal + cgstAmount + sgstAmount);

  // Normalise old-format invoice numbers (TDY-0001 → TDY260001, ELT-0003 → ELT260003)
  const normalizeInvoiceNumber = (num) => {
    if (!num) return num;
    const match = num.match(/^(TDY|ELT|ALC)-(\d+)$/);
    if (match) {
      const prefix  = match[1];
      const counter = parseInt(match[2], 10);
      // Use year from billDate if available, otherwise current year
      const yr = billDate && billDate.length >= 4 ? billDate.slice(2, 4) : new Date().getFullYear().toString().slice(-2);
      return `${prefix}${yr}${String(counter).padStart(4, '0')}`;
    }
    return num;
  };

  // Display generated invoice number or placeholder
  const currentYear = new Date().getFullYear().toString().slice(-2);
  const rawInvoiceNumber = invoiceNumber || (company.shortName === 'ELITE' ? `ELT${currentYear}0000` : company.shortName === 'ALL CARE' ? `ALC${currentYear}0000` : `TDY${currentYear}0000`);
  const displayInvoiceNumber = normalizeInvoiceNumber(rawInvoiceNumber);

  // Elite helper for client address
  const getEliteClientAddress = (placeVal) => {
    const isSalem = String(placeVal).toLowerCase().includes('salem');
    const addr = isSalem
      ? (customAddresses?.elite?.clientSalem || 'DTDC Express Limited,\nNo. 12, Salem Main Road,\nSalem,\nTamil Nadu - 636001.\nGST No: 33AAACD8017H1ZZ')
      : (customAddresses?.elite?.clientCoimbatore || 'DTDC Express Limited,\nNo. 396, Ponniyakadu Thottam,\nSengodagoundan Pudur, Salem-Kochi NH,\nSulur Pirivu, Coimbatore,\nTamil Nadu - 641037.\nGST No: 33AAACD8017H1ZZ');
    return addr.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br /></React.Fragment>);
  };

  // Helper to generate dates range
  const getDatesInRange = (startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return [];
    const dates = [];
    let curr = new Date(startDateStr);
    const end = new Date(endDateStr);
    let limit = 0;
    while (curr <= end && limit < 100) {
      dates.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
      limit++;
    }
    return dates;
  };

  // Helper for deterministic natural-looking distribution
  const getDailyQuantities = (totalDuties, numDays) => {
    if (numDays <= 0) return [];
    if (numDays === 1) return [totalDuties];

    const quantities = [];
    let remaining = totalDuties;
    const weights = [];
    for (let i = 0; i < numDays; i++) {
      const w = 1.0 + 0.4 * Math.sin(i * 1.7) + 0.2 * Math.cos(i * 3.1);
      weights.push(w);
    }
    const sumWeights = weights.reduce((a, b) => a + b, 0);

    let allocatedSum = 0;
    for (let i = 0; i < numDays - 1; i++) {
      const qty = Math.max(1, Math.round((weights[i] / sumWeights) * totalDuties));
      quantities.push(qty);
      allocatedSum += qty;
    }

    let lastQty = totalDuties - allocatedSum;
    if (lastQty < 0) {
      quantities.push(0);
      let i = numDays - 2;
      while (lastQty < 0 && i >= 0) {
        const reduce = Math.min(quantities[i], -lastQty);
        quantities[i] -= reduce;
        lastQty += reduce;
        i--;
      }
      quantities[numDays - 1] = lastQty;
    } else {
      quantities.push(lastQty);
    }
    return quantities;
  };

  // ── Print / Download handler ───────────────────────────────────────────────
  // For Tidy + digitalSign ON: capture the invoice card as a PDF and send to
  // the backend for PKCS#11 signing, then trigger an auto-download.
  // Otherwise: open the browser print dialog as usual.
  const handlePrint = async () => {
    const saved = await onSaveBill(false);
    if (!saved) return;

    // Wait briefly for state updates / UI render (e.g. invoice number)
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (isTidy && digitalSign) {
      await handleDownloadAndSign();
    } else {
      window.print();
    }

    if (onResetForm) {
      onResetForm(true);
    }
  };

  // ── Capture invoice → PDF → Sign via backend ─────────────────────────────
  const handleDownloadAndSign = async () => {
    const el = tidyInvoiceRef.current;
    if (!el) return;

    setSignStatus('capturing');
    setSignError('');

    try {
      // 1. Capture invoice card as high-resolution canvas
      const canvas = await html2canvas(el, {
        scale: 2,           // 2× for print-quality sharpness
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      // 2. Pack canvas into an A4 PDF (portrait)
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      // Scale image to fill the page width, maintaining aspect ratio
      const ratio = canvas.width / canvas.height;
      const imgW = pageW;
      const imgH = pageW / ratio;
      const yOffset = imgH < pageH ? (pageH - imgH) / 2 : 0;
      pdf.addImage(imgData, 'PNG', 0, yOffset, imgW, imgH);

      const pdfBlob = pdf.output('blob');

      setSignStatus('signing');

      // 3. POST to backend with the PDF and the signature field coordinates
      // Measure where the signature placeholder sits inside the invoice card,
      // then convert to PDF point coordinates so pyhanko places the
      // PKCS#11 signature widget exactly where the visual slot is.
      const fileName = `TDY_${invoiceNumber || 'invoice'}.pdf`;
      const formData = new FormData();
      formData.append('pdf', pdfBlob, fileName);

      // --- coordinate conversion -------------------------------------------
      // jsPDF places the invoice image starting at (0, yOffset) on an A4 page.
      // A4 in PDF points: 595.28 x 841.89 pt.
      const PDF_W_PT = 595.28;
      const PDF_H_PT = 841.89;
      const MM_TO_PT = 2.8346;
      const pageWpt = pageW * MM_TO_PT;   // should equal PDF_W_PT
      const pageHpt = pageH * MM_TO_PT;
      const imgWpt  = imgW  * MM_TO_PT;
      const imgHpt  = imgH  * MM_TO_PT;
      const yOffPt  = yOffset * MM_TO_PT;

      let sigCoords = null;
      if (tidySigAreaRef.current) {
        const cardRect = el.getBoundingClientRect();
        const sigRect  = tidySigAreaRef.current.getBoundingClientRect();

        // Fraction of the invoice card occupied by the sig area
        const relX1 = (sigRect.left   - cardRect.left) / cardRect.width;
        const relY1 = (sigRect.top    - cardRect.top)  / cardRect.height;
        const relX2 = (sigRect.right  - cardRect.left) / cardRect.width;
        const relY2 = (sigRect.bottom - cardRect.top)  / cardRect.height;

        // Map to PDF image coordinates (pt), then flip Y (PDF origin = bottom-left)
        const pdfX1 = relX1 * imgWpt;
        const pdfX2 = relX2 * imgWpt;
        // relY* is from image top; convert to distance-from-bottom-of-page
        const pdfY1 = pageHpt - yOffPt - (relY2 * imgHpt);
        const pdfY2 = pageHpt - yOffPt - (relY1 * imgHpt);

        sigCoords = { x1: pdfX1, y1: pdfY1, x2: pdfX2, y2: pdfY2 };
        formData.append('sig_x1', pdfX1.toFixed(2));
        formData.append('sig_y1', pdfY1.toFixed(2));
        formData.append('sig_x2', pdfX2.toFixed(2));
        formData.append('sig_y2', pdfY2.toFixed(2));
      }
      // -----------------------------------------------------------------------

      const resp = await fetch('/api/sign-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Server error ${resp.status}`);
      }

      // 4. Download the signed PDF
      const signedBlob = await resp.blob();
      const url = URL.createObjectURL(signedBlob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = resp.headers.get('Content-Disposition') || '';
      const fnMatch = disposition.match(/filename[^;=\n]*=([^;\n]*)/);
      a.download = fnMatch
        ? fnMatch[1].replace(/["']/g, '').trim()
        : `signed_${fileName}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSignStatus('done');
      setTimeout(() => setSignStatus('idle'), 4000);
    } catch (err) {
      setSignError(err.message || 'Signing failed');
      setSignStatus('error');
      setTimeout(() => { setSignStatus('idle'); setSignError(''); }, 6000);
    }
  };

  if (company.shortName === 'ELITE') {
    const eliteItems = activeBill.eliteItems || [];
    const eliteSubtotal = eliteItems.reduce((sum, item) => sum + (parseInt(item.qty, 10) || 0) * (parseFloat(item.rate) || 0), 0);
    const eliteTotal = eliteSubtotal;
    const displayPlaceElite = place || 'Sulur Hub';

    const formatDateHyphens = (dateStr) => {
      if (!dateStr) return '—';
      const d = new Date(dateStr);
      if (isNaN(d)) return dateStr;
      return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    };

    return (
      <div className="invoice-wrapper animated-fade-in">
        <div className="tidy-invoice-card" style={{ color: '#1f2937', padding: '2rem 3rem' }}>
          {/* Elite Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img src={company.logoSrc} alt={company.name} style={{ maxHeight: '100px', width: 'auto' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '25px', fontWeight: '800', color: '#1e293b', margin: 0, letterSpacing: '1px' }}>INVOICE</h1>
            </div>
          </div>

          {/* Company & Invoice Meta Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem', marginBottom: '0.5rem', textAlign: 'left' }}>
            <div style={{ fontSize: '12px', lineHeight: '1.5', color: '#4b5563' }}>
              <strong style={{ fontSize: '14px', color: '#1f2937' }}>{company.name}</strong><br />
              {(customAddresses?.elite?.company || 'No. 125, Annai Velakanni Nagar,\nSowripalayam, Coimbatore,\nTamilnadu - 641028.')
                .split('\n').map((line, i) => <React.Fragment key={i}>{line}<br /></React.Fragment>)}
              Phone: {company.phone}<br />
              Email: {company.email}
            </div>
            <div style={{ fontSize: '12px', textAlign: 'right' }}>
              <table style={{ borderCollapse: 'collapse', marginLeft: 'auto' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '2px 6px', fontWeight: '600', color: '#4b5563', textAlign: 'right' }}>Invoice No:</td>
                    <td style={{ padding: '2px 6px', color: '#1f2937', textAlign: 'left' }}><strong>{displayInvoiceNumber}</strong></td>
                  </tr>
                  <tr>
                    <td style={{ padding: '2px 6px', fontWeight: '600', color: '#4b5563', textAlign: 'right' }}>Date:</td>
                    <td style={{ padding: '2px 6px', color: '#1f2937', textAlign: 'left' }}>{displayDate}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '2px 6px', fontWeight: '600', color: '#4b5563', textAlign: 'right' }}>Place:</td>
                    <td style={{ padding: '2px 6px', color: '#1f2937', textAlign: 'left' }}>{displayPlaceElite}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '2px 6px', fontWeight: '600', color: '#4b5563', textAlign: 'right' }}>Pan:</td>
                    <td style={{ padding: '2px 6px', color: '#1f2937', textAlign: 'left' }}>{company.pan}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Divider */}
          <hr style={{ border: 0, borderTop: '1px solid #1e293b', marginBottom: '0.5rem' }} />

          {/* Bill To & Supply To */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem', marginBottom: '0.5rem', textAlign: 'left' }}>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontWeight: '700', marginBottom: '0.5rem', color: '#1f2937', fontSize: '12px', paddingBottom: '4px' }}>Bill To:</h4>
              <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.6', color: '#4b5563' }}>
                {customAddresses?.elite?.billTo && customAddresses.elite.billTo.trim()
                  ? customAddresses.elite.billTo.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br /></React.Fragment>)
                  : getEliteClientAddress(place)}
              </p>
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontWeight: '700', marginBottom: '0.5rem', color: '#1f2937', fontSize: '12px', paddingBottom: '4px' }}>Supply To:</h4>
              <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.6', color: '#4b5563' }}>
                {customAddresses?.elite?.supplyTo && customAddresses.elite.supplyTo.trim()
                  ? customAddresses.elite.supplyTo.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br /></React.Fragment>)
                  : getEliteClientAddress(place)}
              </p>
            </div>
          </div>

          {/* Elite Table */}
          <div>
            <table style={{ width: 'calc(100% - 2px)', margin: '0 auto', borderCollapse: 'collapse', fontSize: '11px', border: '1px solid #e2e8f0' }}>
              <thead>
                <tr style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>
                  <th style={{ padding: '0.4rem', fontWeight: '600', textAlign: 'center', border: '1px solid #e2e8f0' }}>S.NO</th>
                  <th style={{ padding: '0.4rem', fontWeight: '600', textAlign: 'center', border: '1px solid #e2e8f0' }}>DATE</th>
                  <th style={{ padding: '0.4rem', fontWeight: '600', textAlign: 'left', border: '1px solid #e2e8f0' }}>PRODUCTS</th>
                  <th style={{ padding: '0.4rem', fontWeight: '600', textAlign: 'center', border: '1px solid #e2e8f0' }}>QTY</th>
                  <th style={{ padding: '0.4rem', fontWeight: '600', textAlign: 'center', border: '1px solid #e2e8f0' }}>RATE (₹)</th>
                  <th style={{ padding: '0.4rem', fontWeight: '600', textAlign: 'center', border: '1px solid #e2e8f0' }}>TOTAL (₹)</th>
                </tr>
              </thead>
              <tbody>
                {eliteItems.map((item, index) => {
                  const qty = parseInt(item.qty, 10) || 0;
                  const rateVal = parseFloat(item.rate) || 0;
                  const total = qty * rateVal;
                  return (
                    <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
                      <td style={{ padding: '0.4rem', textAlign: 'center', border: '1px solid #e2e8f0', color: '#4b5563' }}>{index + 1}</td>
                      <td style={{ padding: '0.4rem', textAlign: 'center', border: '1px solid #e2e8f0', color: '#4b5563' }}>{formatDateHyphens(item.date)}</td>
                      <td style={{ padding: '0.4rem', textAlign: 'left', border: '1px solid #e2e8f0', color: '#4b5563', fontWeight: '500' }}>{item.particulars ? item.particulars.toUpperCase() : 'TEA'}</td>
                      <td style={{ padding: '0.4rem', textAlign: 'center', border: '1px solid #e2e8f0', color: '#4b5563' }}>{qty || ''}</td>
                      <td style={{ padding: '0.4rem', textAlign: 'center', border: '1px solid #e2e8f0', color: '#4b5563' }}>{rateVal ? formatCurrency(rateVal) : ''}</td>
                      <td style={{ padding: '0.4rem', textAlign: 'center', border: '1px solid #e2e8f0', color: '#4b5563' }}>{total ? formatCurrency(total) : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Subtotal, Total Box */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', margin: '1rem' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: '0 8px', fontSize: '11px', width: '250px' }}>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'right', fontWeight: '800', color: '#1f2937' }}>GRAND TOTAL</td>
                  <td style={{ textAlign: 'right', fontWeight: '800', color: '#1f2937' }}>{eliteTotal ? formatCurrency(eliteTotal) : ''}</td>
                </tr>
              </tbody>
            </table>
            <div style={{ fontSize: '10px', color: '#6b7280', fontStyle: 'italic', fontWeight: '500' }}>
              ({numberToWords(eliteTotal || 0)})
            </div>
          </div>

          {/* Signatory for Elite */}
          <div style={{ textAlign: 'right', margin: '2rem 0', fontSize: '11px', color: '#374151' }}>
            <p style={{ margin: 0, fontWeight: '700' }}>FOR {company.name.toUpperCase()}</p>
            {digitalSign ? (
              <div className="signature-display" style={{ alignItems: 'flex-end', margin: '0.25rem 0' }}>
                <svg viewBox="0 0 150 50" className="signature-svg">
                  <path
                    d="M 15 32 Q 33 8 42 28 C 50 12, 58 38, 68 22 C 78 6, 85 30, 95 18 T 115 15 Q 125 5 132 22 T 142 18 M 25 36 Q 85 42 138 32"
                    fill="none"
                    stroke={company.color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="digitally-signed-badge">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '2px' }}>
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Digitally Signed
                </span>
              </div>
            ) : (
              <div style={{ height: '45px' }}></div>
            )}
            <p style={{ margin: 0, fontWeight: '500' }}>Authorized Signatory</p>
          </div>
        </div>

      </div>
    );
  }

  // ──────────── ALL CARE INVOICE TEMPLATE ────────────
  if (company.shortName === 'ALL CARE') {
    const allCareItems = activeBill.eliteItems || [];
    const acSubtotal = allCareItems.reduce((sum, item) => sum + (parseInt(item.qty, 10) || 0) * (parseFloat(item.rate) || 0), 0);
    const acGrandTotal = Math.round(acSubtotal * 100) / 100;

    const formatDateAllCare = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d)) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const mon = d.toLocaleString('en-US', { month: 'short' });
      const year = d.getFullYear();
      return `${day}-${mon}-${year}`;
    };

    const getMonthNameAllCare = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d)) return '';
      const month = d.toLocaleString('en-US', { month: 'long' }).toUpperCase();
      const year = d.getFullYear();
      return `${month} - ${year}`;
    };

    return (
      <div className="invoice-wrapper animated-fade-in">
        <div className="tidy-invoice-card allcare-invoice" style={{ color: '#000000', backgroundColor: '#ffffff', minHeight: '1123px', display: 'flex', flexDirection: 'column', position: 'relative', padding: '3rem' }}>

          {/* Header block: Logo clock + Brand name */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            marginBottom: '5rem'
          }}>
            <img src={company.logoSrc} alt={company.name} style={{ height: '90px', width: 'auto', display: 'block' }} />
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', paddingTop: '15px' }}>
              <div style={{
                fontSize: '50px',
                fontWeight: '800',
                color: '#0e2240',
                lineHeight: '1.0',
                letterSpacing: '-0.5px'
              }}>
                ALLCARE
              </div>
              <div style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#0e2240',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
                MANAGEMENT SERVICES
              </div>
            </div>
          </div>

          {/* Billing Info & Metadata Section */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '5rem',
            textAlign: 'left',
            alignItems: 'flex-start'
          }}>
            {/* Left side: Bill To */}
            <div>
              <div style={{ fontWeight: '700', fontSize: '13px', marginBottom: '0.6rem', color: '#000000' }}>BILL TO:</div>
              <div style={{ fontSize: '12px', lineHeight: '1.6', color: '#000000', fontWeight: '400' }}>
                {(customAddresses?.allCare?.client || 'DTDC Express Limited,\nNo. 92, Parameshwaran Layout,\nPappanaickenpalayam,\nCoimbatore, Tamil Nadu - 641037\nGST No: 33AAACD8017H1ZZ')
                  .split('\n').map((line, i) => <React.Fragment key={i}>{line}<br /></React.Fragment>)}
              </div>
            </div>

            {/* Right side: Metadata */}
            <div style={{
              fontSize: '12px',
              lineHeight: '1.6',
              color: '#000000',
              textAlign: 'right'
            }}>
              <div>Invoice No: {displayInvoiceNumber}</div>
              <div>Date: {formatDateAllCare(billDate)}</div>
              <div>Month: {getMonthNameAllCare(billDate || fromDate)}</div>
              <div>Bill From: {formatDateAllCare(fromDate)} To: {formatDateAllCare(toDate)}</div>
              <div>PAN: {company.pan}</div>
            </div>
          </div>

          {/* Table */}
          <div style={{ marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#363636', color: '#ffffff' }}>
                  <th style={{ padding: '0.6rem 0.8rem', fontWeight: '700', textAlign: 'center', border: 'none', width: '60px' }}>S. NO</th>
                  <th style={{ padding: '0.6rem 0.8rem', fontWeight: '700', textAlign: 'left', border: 'none' }}>DESCRIPTION</th>
                  <th style={{ padding: '0.6rem 0.8rem', fontWeight: '700', textAlign: 'right', border: 'none', width: '80px' }}>QTY</th>
                  <th style={{ padding: '0.6rem 0.8rem', fontWeight: '700', textAlign: 'right', border: 'none', width: '90px' }}>NO. OF DUTIES</th>
                  <th style={{ padding: '0.6rem 0.8rem', fontWeight: '700', textAlign: 'right', border: 'none', width: '100px' }}>PRICE (₹)</th>
                  <th style={{ padding: '0.6rem 0.8rem', fontWeight: '700', textAlign: 'right', border: 'none', width: '120px' }}>TOTAL (₹)</th>
                </tr>
              </thead>
              <tbody>
                {allCareItems.map((item, index) => {
                  const qty = parseInt(item.qty, 10) || 0;
                  const rateVal = parseFloat(item.rate) || 0;
                  const total = qty * rateVal;
                  const desc = item.place 
                    ? `${item.particulars || ''} - ${item.place}` 
                    : (item.particulars || item.description || '');
                  return (
                    <tr key={index} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#ffffff' }}>
                      <td style={{ padding: '0.75rem 0.8rem', textAlign: 'center', color: '#000000', width: '60px' }}>{index + 1}</td>
                      <td style={{ padding: '0.75rem 0.8rem', textAlign: 'left', color: '#000000' }}>{desc}</td>
                      <td style={{ padding: '0.75rem 0.8rem', textAlign: 'right', color: '#000000' }}>{qty || '0'}</td>
                      <td style={{ padding: '0.75rem 0.8rem', textAlign: 'right', color: '#000000' }}>{item.noOfDuties || '0'}</td>
                      <td style={{ padding: '0.75rem 0.8rem', textAlign: 'right', color: '#000000' }}>{rateVal ? formatCurrency(rateVal) : '0.00'}</td>
                      <td style={{ padding: '0.75rem 0.8rem', textAlign: 'right', color: '#000000' }}>{total ? formatCurrency(total) : '0.00'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Box on Right */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '10rem' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '12px', width: '250px' }}>
              <tbody>
                <tr style={{ backgroundColor: '#363636', color: '#ffffff' }}>
                  <td style={{ padding: '0.6rem 0.8rem', textAlign: 'left', fontWeight: '700' }}>GRAND TOTAL (₹)</td>
                  <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right', fontWeight: '700' }}>{acGrandTotal ? formatCurrency(acGrandTotal) : '0.00'}</td>
                </tr>
              </tbody>
            </table>
            <div style={{ fontSize: '11px', color: '#000000', marginTop: '0.8rem', fontWeight: '600', fontStyle: 'italic', textAlign: 'right' }}>
              Rupees {numberToWords(acGrandTotal || 0)}
            </div>
          </div>

          {/* Spacing before footer */}
          <div style={{ flexGrow: 1, minHeight: '120px' }}></div>

          {/* Footer Address Centered */}
          <div className="allcare-footer" style={{ textAlign: 'center', fontSize: '10px', color: '#000000', lineHeight: '1.5', position: 'absolute', bottom: '3rem', left: '3rem', right: '3rem' }}>
            <hr style={{ border: 'none', borderTop: '1px solid #000000', marginBottom: '0.8rem', width: '100%' }} />
            {(customAddresses?.allCare?.company || 'NO. 381/385, VENNU GOPAL LAYOUT, PN PALAYAM, PAPPANAICKENPALAYAM, COIMBATORE, TAMIL NADU – 641037.\nPhone: +91 95005 95749')
              .split('\n').map((line, i) => <div key={i}>{line}</div>)}
          </div>

        </div>

      </div>
    );
  }


  return (
    <div className="invoice-wrapper animated-fade-in">
      <div className="tidy-invoice-card" ref={tidyInvoiceRef}>
        {/* Header */}
        <div className="tidy-header" style={{ borderBottomColor: company.color }}>
          <div className="tidy-header-left">
            <h1 className="tidy-title" style={{ color: company.color }}>TAX INVOICE</h1>
          </div>
          <div className="tidy-header-right">
            {company.logoType === 'image' ? (
              <img src={company.logoSrc} alt={company.name} className="tidy-logo" />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: company.shortName === 'ELITE' ? '50%' : '8px',
                  backgroundColor: company.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '18px'
                }}>{company.shortName.charAt(0)}</div>
                <div style={{ textAlign: 'left', lineHeight: '1.1' }}>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: company.color, letterSpacing: '0.5px' }}>{company.logoText}</span>
                  <br />
                  <span style={{ fontSize: '8px', fontWeight: '600', color: '#6b7280', letterSpacing: '1.5px' }}>{company.subText}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Invoice Info */}
        <div className="tidy-info-row">
          <div className="tidy-issued-to">
            <h4>ISSUED TO:</h4>
            <p>
              {(customAddresses?.tidy?.client || 'M/S DTDC EXPRESS LIMITED,\n136, DIAMOND TOWER,\nA-20 TVK INDUSTRIAL ESTATE,\nGUINDY, CHENNAI-600032.')
                .split('\n').map((line, i) => <React.Fragment key={i}>{line}<br /></React.Fragment>)}
            </p>
            <br />
            <p>State: Tamil Nadu<br />
              State Code: 33<br />
              GSTIN: 33AAACD8017H1ZZ<br />
              Unit Name: DTDC, {displayPlace.toUpperCase()}<br />
              Bill From : {displayFromDate || '...'} TO {displayToDate || '...'}</p>
          </div>
          <div className="tidy-invoice-details">
            <table className="tidy-meta-table">
              <tbody>
                <tr>
                  <td className="meta-label">INVOICE NO:</td>
                  <td className="meta-value"><strong>{displayInvoiceNumber}</strong></td>
                </tr>
                <tr>
                  <td className="meta-label">DATE:</td>
                  <td className="meta-value">{displayDate}</td>
                </tr>
                <tr>
                  <td className="meta-label">MONTH:</td>
                  <td className="meta-value">{displayMonth}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Main Table */}
        <div className="tidy-table-wrapper">
          <table className="tidy-main-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: `1px solid ${company.color}`, borderTop: `1px solid ${company.color}` }}>DESIGNATION</th>
                <th style={{ borderBottom: `1px solid ${company.color}`, borderTop: `1px solid ${company.color}` }}>NO OF<br />PERSONNEL</th>
                <th style={{ borderBottom: `1px solid ${company.color}`, borderTop: `1px solid ${company.color}` }}>PAY RATE<br />(₹)</th>
                <th style={{ borderBottom: `1px solid ${company.color}`, borderTop: `1px solid ${company.color}` }}>NO. OF<br />DUTIES/HRS</th>
                <th style={{ textAlign: 'right', borderBottom: `1px solid ${company.color}`, borderTop: `1px solid ${company.color}` }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: 'left' }}>{designation || 'Brand consultation'}</td>
                <td>{numPersonnel || ''}</td>
                <td>{dutyRate ? formatCurrency(dutyRate) : ''}</td>
                <td>{numDuties || ''}</td>
                <td style={{ textAlign: 'right' }}>{subtotal ? formatCurrency(subtotal) : ''}</td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td></td>
                <td>CGST(9%)</td>
                <td style={{ textAlign: 'right' }}>{cgstAmount ? formatCurrency(cgstAmount) : ''}</td>
              </tr>
              <tr>
                <td></td>
                <td></td>
                <td></td>
                <td>SGST(9%)</td>
                <td style={{ textAlign: 'right' }}>{sgstAmount ? formatCurrency(sgstAmount) : ''}</td>
              </tr>
            </tbody>
          </table>
          <div className="tidy-grand-total" style={{ borderTop: `1px solid ${company.color}` }}>
            <div className="gt-label"><strong>GRAND TOTAL (₹)</strong></div>
            <div className="gt-value"><strong>{grandTotal ? formatCurrency(grandTotal) : ''}</strong></div>
          </div>
        </div>

        <div className="tidy-amount-words">
          Amount In words: {numberToWords(grandTotal)}
        </div>

        <div className="tidy-digital-signature">
          <p>For {company.name}</p>
          {digitalSign ? (
            // When digital sign is ON: show a blank placeholder.
            // The visual SVG is removed so it doesn’t appear in the captured PDF.
            // The real PKCS#11 signature widget will be placed here by pyhanko.
            <div
              ref={tidySigAreaRef}
              style={{ height: '55px', width: '180px', marginLeft: 'auto' }}
            />
          ) : (
            <div style={{ height: '45px' }}></div>
          )}
          <p>Authorized Signatory</p>
        </div>

        <div className="tidy-footer-info">
          <div className="footer-left-block">
            <p>State: Tamil Nadu<br />
              State Code: 33<br />
              PAN NO: {company.pan}<br />
              GST: {company.gst}</p>
          </div>

          <div className="footer-instructions">
            <p><strong>No cash payments; you may pay through the following options:</strong><br />
              (a) Demand draft or Cheque in favour of our company or<br />
              (b) You may make an online payment directly to our account.</p>
          </div>

          <div className="footer-bank-details">
            <p><strong>PAY TO:</strong><br />
              Bank Name: {company.bankName}<br />
              Account No: {company.accountNo}<br />
              ISFC: {company.ifsc}<br />
              (Payment beyond 15 days from the date of invoice will carry interest @ 1.5% per month)</p>
          </div>
        </div>
      </div>

    </div>
  );
}
