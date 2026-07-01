import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import CustomSelect from './CustomSelect';

export default function Dashboard({ bills, onLoadBill, onViewChange, onUpdateBillStatus, onDeleteBill }) {

	// Calculate grand total for a bill
	const calculateGrandTotal = (bill) => {
		const data = bill.data || {};
		const company = bill.company;

		if (company === 'Elite') {
			const items = data.eliteItems || [];
			return items.reduce((sum, item) => sum + (parseInt(item.qty, 10) || 0) * (parseFloat(item.rate) || 0), 0);
		} else if (company === 'All Care') {
			const items = data.eliteItems || [];
			const subtotal = items.reduce((sum, item) => sum + (parseInt(item.qty, 10) || 0) * (parseFloat(item.rate) || 0), 0);
			return Math.round(subtotal * 100) / 100;
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

	// States for filters
	const [selectedCompany, setSelectedCompany] = useState('All');
	const [selectedStatus, setSelectedStatus] = useState('All');
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const [currentPage, setCurrentPage] = useState(1);
	const [statusConfirm, setStatusConfirm] = useState(null);
	const [tdsInput, setTdsInput] = useState('');
	const [deleteConfirm, setDeleteConfirm] = useState(null);
	const itemsPerPage = 10;

	// Reset page to 1 when filters change
	useEffect(() => {
		setCurrentPage(1);
	}, [selectedCompany, selectedStatus, startDate, endDate]);

	// Filter bills based on current criteria
	const filteredBills = bills.filter(bill => {
		// Company filter
		if (selectedCompany !== 'All' && bill.company !== selectedCompany) {
			return false;
		}

		// Status filter
		if (selectedStatus !== 'All') {
			const billStatus = bill.status || 'Pending';
			if (selectedStatus === 'Received' && billStatus !== 'Received') return false;
			if (selectedStatus === 'Pending' && billStatus === 'Received') return false;
		}

		// Date range selector
		if (startDate && bill.billDate < startDate) {
			return false;
		}
		if (endDate && bill.billDate > endDate) {
			return false;
		}

		return true;
	});

	// Compute overall stats for filtered bills
	const totalInvoices = filteredBills.length;
	const totalRevenue = filteredBills.reduce((sum, bill) => {
		const billTotal = calculateGrandTotal(bill);
		const netTotal = bill.status === 'Received'
			? (bill.data?.receivedAmount !== undefined ? bill.data.receivedAmount : (billTotal - (bill.data?.tds || 0)))
			: billTotal;
		return sum + netTotal;
	}, 0);
	const receivedCount = filteredBills.filter(bill => bill.status === 'Received').length;
	const pendingCount = filteredBills.filter(bill => bill.status !== 'Received').length;

	// Format currency value to INR format
	const formatCurrency = (val) => {
		return val.toLocaleString('en-IN', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		});
	};

	// Format YYYY-MM-DD date to DD-MM-YYYY
	const formatDate = (dateStr) => {
		if (!dateStr) return '—';
		const parts = dateStr.split('-');
		if (parts.length === 3 && parts[0].length === 4) {
			return `${parts[2]}-${parts[1]}-${parts[0]}`;
		}
		return dateStr;
	};

	// Normalise old-format invoice numbers (TDY-0001 → TDY260001, ELT-0003 → ELT260003)
	const normalizeInvoiceNumber = (num, billDate) => {
		if (!num) return num;
		const match = num.match(/^(TDY|ELT|ALC)-(\d+)$/);
		if (match) {
			const prefix = match[1];
			const counter = parseInt(match[2], 10);
			const yr = billDate && billDate.length >= 4 ? billDate.slice(2, 4) : new Date().getFullYear().toString().slice(-2);
			return `${prefix}${yr}${String(counter).padStart(4, '0')}`;
		}
		return num;
	};

	const sortedBills = [...filteredBills].sort((a, b) => (b.id || 0) - (a.id || 0));

	const confirmingBill = statusConfirm ? bills.find(b => b.id === statusConfirm.id) : null;
	const grandTotal = confirmingBill ? calculateGrandTotal(confirmingBill) : 0;

	const handleStatusClick = (id, currentStatus) => {
		if (currentStatus === 'Received') return;
		if (currentStatus === 'Pending' || !currentStatus) {
			const bill = bills.find(b => b.id === id);
			const total = bill ? calculateGrandTotal(bill) : 0;
			const initialTds = Math.round(total * 0.02 * 100) / 100;
			setTdsInput(String(initialTds));
			setStatusConfirm({ id, currentStatus });
		} else {
			onUpdateBillStatus(id, currentStatus);
		}
	};

	const totalPages = Math.ceil(sortedBills.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedBills = sortedBills.slice(startIndex, startIndex + itemsPerPage);

	useEffect(() => {
		if (currentPage > 1 && currentPage > totalPages) {
			setCurrentPage(totalPages || 1);
		}
	}, [sortedBills.length, totalPages, currentPage]);

	const handleClearFilters = () => {
		setSelectedCompany('All');
		setSelectedStatus('All');
		setStartDate('');
		setEndDate('');
	};

	return (
		<div className="dashboard-container animated-fade-in">

			{/* Overview Statistics */}
			<div className="dashboard-summary-grid">
				{/* Total Revenue */}
				<div className="dashboard-glass-card">
					<div className="stat-header">
						<span className="stat-label">Total Revenue</span>
						<div className="stat-icon-wrapper" style={{ color: 'var(--success)' }}>
							<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
								<path d="M6 3h12M6 8h12M6 13h5.5a4.5 4.5 0 1 0 0-9H6M9 13l9 9" />
							</svg>
						</div>
					</div>
					<div>
						<h2 className="stat-value">₹ {formatCurrency(totalRevenue)}</h2>
						<p className="stat-footer">Cumulative invoice earnings</p>
					</div>
				</div>

				{/* Total Invoices */}
				<div className="dashboard-glass-card">
					<div className="stat-header">
						<span className="stat-label">Total Invoices</span>
						<div className="stat-icon-wrapper" style={{ color: 'var(--primary)' }}>
							<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
								<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
								<polyline points="14 2 14 8 20 8"></polyline>
								<line x1="16" y1="13" x2="8" y2="13"></line>
								<line x1="16" y1="17" x2="8" y2="17"></line>
							</svg>
						</div>
					</div>
					<div>
						<h2 className="stat-value">{totalInvoices}</h2>
						<p className="stat-footer">Invoices archived in history</p>
					</div>
				</div>

				{/* Received Invoices */}
				<div className="dashboard-glass-card">
					<div className="stat-header">
						<span className="stat-label">Received</span>
						<div className="stat-icon-wrapper" style={{ color: 'var(--success)' }}>
							<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
								<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
								<polyline points="22 4 12 14.01 9 11.01"></polyline>
							</svg>
						</div>
					</div>
					<div>
						<h2 className="stat-value" style={{ color: 'var(--success)' }}>{receivedCount}</h2>
						<p className="stat-footer">Payments settled successfully</p>
					</div>
				</div>

				{/* Pending Invoices */}
				<div className="dashboard-glass-card">
					<div className="stat-header">
						<span className="stat-label">Pending</span>
						<div className="stat-icon-wrapper" style={{ color: '#f59e0b' }}>
							<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
								<circle cx="12" cy="12" r="10"></circle>
								<polyline points="12 6 12 12 16 14"></polyline>
							</svg>
						</div>
					</div>
					<div>
						<h2 className="stat-value" style={{ color: '#f59e0b' }}>{pendingCount}</h2>
						<p className="stat-footer">Awaiting payment confirmation</p>
					</div>
				</div>
			</div>
			{/* Filters Section */}
			<div className="glass-card" style={{ 
				display: 'flex', 
				flexWrap: 'wrap', 
				gap: '1.25rem', 
				alignItems: 'flex-end',
				justifyContent: 'space-between',
				border: 'none',
				boxShadow: 'none',
				background: 'transparent'
			}}>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', flex: 1, justifyContent: 'end' }}>
					{/* Company Filter */}
					<div style={{ minWidth: '180px' }}>
						<CustomSelect
							value={selectedCompany}
							onChange={(val) => setSelectedCompany(val)}
							options={[
								{ value: 'All', label: 'All Companies' },
								{ value: 'Elite', label: 'Elite' },
								{ value: 'All Care', label: 'All Care' },
								{ value: 'Tidy', label: 'Tidy' },
							]}
							placeholder="All Companies"
							style={{ fontSize: '0.9rem', height: '42px', borderRadius: 'var(--border-radius-sm)' }}
						/>
					</div>

					{/* Status Filter */}
					<div style={{ minWidth: '180px' }}>
						<CustomSelect
							value={selectedStatus}
							onChange={(val) => setSelectedStatus(val)}
							options={[
								{ value: 'All', label: 'All Status' },
								{ value: 'Pending', label: 'Pending' },
								{ value: 'Received', label: 'Received' },
							]}
							placeholder="All Status"
							style={{ fontSize: '0.9rem', height: '42px', borderRadius: 'var(--border-radius-sm)' }}
						/>
					</div>

					{/* Date Range Selector */}
					<div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '150px' }}>
							<input 
								type="date"
								lang="en-GB"
								className="form-input" 
								style={{ padding: '0.55rem 1.25rem 0.55rem 1rem', fontSize: '0.9rem', height: '42px', borderRadius: 'var(--border-radius-sm)' }}
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
							/>
						</div>
						<span style={{ paddingBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' }}>to</span>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '150px' }}>
							<input 
								type="date"
								lang="en-GB"
								className="form-input" 
								style={{ padding: '0.55rem 1.25rem 0.55rem 1rem', fontSize: '0.9rem', height: '42px', borderRadius: 'var(--border-radius-sm)' }}
								value={endDate}
								onChange={(e) => setEndDate(e.target.value)}
							/>
						</div>
					</div>
				</div>

				{/* Clear Filters Button */}
				{(selectedCompany !== 'All' || selectedStatus !== 'All' || startDate || endDate) && (
					<button 
						type="button" 
						className="btn btn-secondary animate-fade-in" 
						style={{ 
							padding: '0.55rem 1.25rem', 
							fontSize: '0.85rem', 
							borderRadius: 'var(--border-radius-sm)', 
							cursor: 'pointer',
							height: '42px',
							width: 'auto',
							display: 'inline-flex',
							alignItems: 'center',
							gap: '0.5rem',
							backgroundColor: 'rgba(239, 68, 68, 0.08)',
							border: '1px solid rgba(239, 68, 68, 0.25)',
							color: '#f87171',
							transition: 'all 0.2s ease'
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
							e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
							e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
						}}
						onClick={handleClearFilters}
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
						Clear Filters
					</button>
				)}
			</div>

			{/* Invoice Details Table */}
			<div className="glass-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 'none' }}>
				{/* Header Table (Static) */}
				<div className="dashboard-table-header-wrapper" style={{ scrollbarGutter: 'stable' }}>
					<table className="dashboard-table" style={{ width: '100%', tableLayout: 'fixed', marginBottom: 0 }}>
						<thead>
							<tr>
								<th style={{ width: '5%', backgroundColor: '#1c1c30', padding: '1.25rem 1rem' }}>S.No</th>
								<th style={{ width: '12%', backgroundColor: '#1c1c30', padding: '1.25rem 1rem' }}>Invoice No</th>
								<th style={{ width: '12%', backgroundColor: '#1c1c30', padding: '1.25rem 1rem' }}>Bill Date</th>
								<th style={{ width: '13%', backgroundColor: '#1c1c30', padding: '1.25rem 1rem' }}>Company</th>
								<th style={{ width: '14%', backgroundColor: '#1c1c30', padding: '1.25rem 1rem', textAlign: 'right' }}>Bill Total</th>
								<th style={{ width: '14%', backgroundColor: '#1c1c30', padding: '1.25rem 1rem', textAlign: 'right' }}>Total</th>
								<th style={{ width: '12%', backgroundColor: '#1c1c30', padding: '1.25rem 1rem', textAlign: 'center' }}>Status</th>
								<th style={{ textAlign: 'right', width: '13%', backgroundColor: '#1c1c30', padding: '1.25rem 2.5rem' }}>Action</th>
							</tr>
						</thead>
					</table>
				</div>

				{/* Body Table (Scrollable) */}
				<div className="dashboard-table-wrapper" style={{ height: '350px', overflowY: 'auto', scrollbarGutter: 'stable' }}>
					<table className="dashboard-table" style={{ width: '100%', tableLayout: 'fixed' }}>
						<colgroup>
							<col style={{ width: '5%' }} />
							<col style={{ width: '12%' }} />
							<col style={{ width: '12%' }} />
							<col style={{ width: '13%' }} />
							<col style={{ width: '14%' }} />
							<col style={{ width: '14%' }} />
							<col style={{ width: '12%' }} />
							<col style={{ width: '12%' }} />
						</colgroup>
						<tbody>
							{sortedBills.length === 0 ? (
								<tr>
									<td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
										No invoices found. Use the invoice form to create one!
									</td>
								</tr>
							) : (
								paginatedBills.map((bill, index) => {
									const billTotal = calculateGrandTotal(bill);
									const netTotal = bill.status === 'Received'
										? (bill.data?.receivedAmount !== undefined ? bill.data.receivedAmount : (billTotal - (bill.data?.tds || 0)))
										: billTotal;

									return (
										<tr key={bill.id}>
											<td>{startIndex + index + 1}</td>
											<td>
												<strong>{normalizeInvoiceNumber(bill.invoiceNumber, bill.billDate) || `INV-${String(bill.id).padStart(4, '0')}`}</strong>
											</td>
											<td>{formatDate(bill.billDate)}</td>
											<td>
												<span style={{
													padding: '0.25rem 0.65rem',
													borderRadius: '20px',
													fontSize: '0.7rem',
													fontWeight: '600',
													backgroundColor: bill.company === 'Elite' ? 'rgba(30, 41, 59, 0.4)' : bill.company === 'All Care' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 92, 246, 0.15)',
													color: bill.company === 'Elite' ? '#cbd5e1' : bill.company === 'All Care' ? '#34d399' : '#a78bfa',
													border: bill.company === 'Elite' ? '1px solid rgba(203, 213, 225, 0.3)' : bill.company === 'All Care' ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(167, 139, 250, 0.3)',
												}}>
													{bill.company}
												</span>
											</td>
											<td style={{ textAlign: 'right' }}>₹ {formatCurrency(billTotal)}</td>
											<td style={{ textAlign: 'right' }}>₹ {formatCurrency(netTotal)}</td>
											<td style={{ textAlign: 'center' }}>
											<button
												type="button"
												onClick={() => handleStatusClick(bill.id, bill.status || 'Pending')}
												style={{
													background: 'none',
													border: 'none',
													padding: 0,
													cursor: (bill.status === 'Received') ? 'default' : 'pointer'
												}}
											>
												<span style={{
													display: 'inline-flex',
													alignItems: 'center',
													gap: '0.25rem',
													padding: '0.25rem 0.65rem',
													borderRadius: '20px',
													fontSize: '0.7rem',
													fontWeight: '700',
													textTransform: 'uppercase',
													transition: 'all 0.2s ease',
													backgroundColor: (bill.status === 'Received') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
													color: (bill.status === 'Received') ? 'var(--success)' : '#f59e0b',
													border: (bill.status === 'Received') ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
												}}
													onMouseEnter={(e) => {
														e.currentTarget.style.transform = 'scale(1.05)';
														e.currentTarget.style.boxShadow = (bill.status === 'Received') ? '0 0 10px rgba(16, 185, 129, 0.2)' : '0 0 10px rgba(245, 158, 11, 0.2)';
													}}
													onMouseLeave={(e) => {
														e.currentTarget.style.transform = 'scale(1)';
														e.currentTarget.style.boxShadow = 'none';
													}}
												>
													{bill.status || 'Pending'}
												</span>
											</button>
										</td>
										<td style={{ textAlign: 'right', paddingRight: '2rem' }}>
											<div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
												<button
													type="button"
													title="Load invoice"
													style={{
														background: 'none',
														border: '1px solid rgba(139, 92, 246, 0.3)',
														borderRadius: '6px',
														padding: '0.3rem 0.4rem',
														cursor: 'pointer',
														color: '#a78bfa',
														display: 'inline-flex',
														alignItems: 'center',
														justifyContent: 'center',
														transition: 'all 0.18s ease',
													}}
													onMouseEnter={(e) => {
														e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.12)';
														e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.6)';
													}}
													onMouseLeave={(e) => {
														e.currentTarget.style.backgroundColor = 'none';
														e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
													}}
													onClick={() => {
														onLoadBill(bill);
														onViewChange('invoice');
													}}
												>
													<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
														<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
														<polyline points="15 3 21 3 21 9"></polyline>
														<line x1="10" y1="14" x2="21" y2="3"></line>
													</svg>
												</button>
												<button
													type="button"
													title="Delete invoice"
													style={{
														background: 'none',
														border: '1px solid rgba(239, 68, 68, 0.3)',
														borderRadius: '6px',
														padding: '0.3rem 0.4rem',
														cursor: 'pointer',
														color: '#f87171',
														display: 'inline-flex',
														alignItems: 'center',
														justifyContent: 'center',
														transition: 'all 0.18s ease',
													}}
													onMouseEnter={(e) => {
														e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
														e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.6)';
													}}
													onMouseLeave={(e) => {
														e.currentTarget.style.backgroundColor = 'none';
														e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
													}}
													onClick={() => {
														setDeleteConfirm(bill);
													}}
												>
													<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
														<polyline points="3 6 5 6 21 6"></polyline>
														<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
														<path d="M10 11v6"></path>
														<path d="M14 11v6"></path>
														<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
													</svg>
												</button>
											</div>
										</td>
									</tr>
								);
							})
						)}
						</tbody>
					</table>
				</div>

				{/* Pagination Footer */}
				{sortedBills.length > 0 && (
					<div className="pagination-footer" style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						padding: '1rem',
						borderTop: '1px solid var(--card-border)'
					}}>
						<span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
							Showing <strong>{startIndex + 1}</strong> to <strong>{Math.min(startIndex + itemsPerPage, sortedBills.length)}</strong> of <strong>{sortedBills.length}</strong> entries
						</span>
						<div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
							<button
								type="button"
								className="btn btn-secondary btn-sm"
								style={{
									padding: '0.3rem 0.6rem',
									fontSize: '1rem',
									borderRadius: '6px',
									cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
									opacity: currentPage === 1 ? 0.5 : 1,
									width: 'auto'
								}}
								disabled={currentPage === 1}
								onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
							>
								Previous
							</button>

							{/* Page numbers */}
							{Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
								<button
									key={page}
									type="button"
									style={{
										padding: '0.3rem 0.6rem',
										fontSize: '1rem',
										borderRadius: '6px',
										cursor: 'pointer',
										background: currentPage === page ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
										color: currentPage === page ? '#ffffff' : 'var(--text-secondary)',
										border: '1px solid',
										borderColor: currentPage === page ? 'var(--primary)' : 'var(--card-border)',
										fontWeight: currentPage === page ? '700' : 'normal',
										transition: 'all 0.2s ease',
										minWidth: '28px',
										textAlign: 'center'
									}}
									onClick={() => setCurrentPage(page)}
								>
									{page}
								</button>
							))}

							<button
								type="button"
								className="btn btn-secondary btn-sm"
								style={{
									padding: '0.3rem 0.6rem',
									fontSize: '1rem',
									borderRadius: '6px',
									cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
									opacity: currentPage === totalPages ? 0.5 : 1,
									width: 'auto'
								}}
								disabled={currentPage === totalPages}
								onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
							>
								Next
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Confirmation Modal */}
			{statusConfirm && createPortal(
				<div style={{
					position: 'fixed',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					backgroundColor: 'rgba(0, 0, 0, 0.65)',
					backdropFilter: 'blur(8px)',
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					zIndex: 10000
				}}>
					<div className="glass-card animate-fade-in" style={{
						width: '420px',
						padding: '2rem',
						borderRadius: 'var(--border-radius-md)',
						border: '1px solid var(--card-border)',
						background: 'var(--bg-secondary)',
						boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
						textAlign: 'center',
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						gap: '1.25rem'
					}}>
						<div style={{
							width: '60px',
							height: '60px',
							borderRadius: '50%',
							backgroundColor: 'rgba(245, 158, 11, 0.12)',
							border: '1px solid rgba(245, 158, 11, 0.3)',
							color: '#f59e0b',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							marginBottom: '0.25rem'
						}}>
							<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
								<circle cx="12" cy="12" r="10"></circle>
								<line x1="12" y1="8" x2="12" y2="12"></line>
								<line x1="12" y1="16" x2="12.01" y2="16"></line>
							</svg>
						</div>

						<div>
							<h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff', marginBottom: '0.5rem' }}>
								Confirm Payment Status
							</h3>
							<p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '1rem' }}>
								Are you sure you want to mark this invoice as <strong>Received</strong>?
							</p>

							{/* Payment Breakdowns */}
							<div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.85rem', textAlign: 'left', margin: '0.5rem 0' }}>
								{/* Grand Total */}
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
									<span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Grand Total</span>
									<span style={{ fontSize: '1.05rem', fontWeight: '700', color: '#ffffff' }}>₹ {formatCurrency(grandTotal)}</span>
								</div>

								{/* TDS (Editable Input) */}
								<div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
									<label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
										<span>TDS Deduction (2% default)</span>
									</label>
									<div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
										<span style={{ position: 'absolute', left: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>₹</span>
										<input
											type="number"
											step="0.01"
											value={tdsInput}
											onChange={(e) => setTdsInput(e.target.value)}
											style={{
												width: '100%',
												padding: '0.65rem 1rem 0.65rem 2rem',
												background: 'rgba(10, 10, 15, 0.6)',
												border: '1px solid var(--card-border)',
												borderRadius: '8px',
												color: '#ffffff',
												fontSize: '0.9rem',
												outline: 'none',
											}}
										/>
									</div>
								</div>

								{/* Received Amount */}
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(16, 185, 129, 0.06)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
									<span style={{ fontSize: '0.85rem', color: 'var(--success)' }}>Received Amount</span>
									<span style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--success)' }}>₹ {formatCurrency(Math.max(0, grandTotal - (parseFloat(tdsInput) || 0)))}</span>
								</div>
							</div>
						</div>

						<div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
							<button
								type="button"
								className="btn btn-secondary"
								style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem', borderRadius: '8px', width: 'auto' }}
								onClick={() => setStatusConfirm(null)}
							>
								Cancel
							</button>
							<button
								type="button"
								className="btn btn-primary"
								style={{
									flex: 1,
									padding: '0.6rem',
									fontSize: '0.85rem',
									borderRadius: '8px',
									backgroundColor: 'var(--success)',
									borderColor: 'var(--success)',
									color: '#ffffff',
									fontWeight: '700',
									width: 'auto'
								}}
								onClick={async () => {
									const tdsValue = parseFloat(tdsInput) || 0;
									const recAmount = Math.max(0, grandTotal - tdsValue);
									await onUpdateBillStatus(statusConfirm.id, statusConfirm.currentStatus, tdsValue, recAmount);
									setStatusConfirm(null);
								}}
							>
								Yes, Confirm
							</button>
						</div>
					</div>
				</div>,
				document.body
			)}

			{/* Delete Confirmation Modal */}
			{deleteConfirm && createPortal(
				<div style={{
					position: 'fixed',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					backgroundColor: 'rgba(0, 0, 0, 0.65)',
					backdropFilter: 'blur(8px)',
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					zIndex: 10000
				}}>
					<div className="glass-card animate-fade-in" style={{
						width: '400px',
						padding: '2rem',
						borderRadius: 'var(--border-radius-md)',
						border: '1px solid var(--card-border)',
						background: 'var(--bg-secondary)',
						boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
						textAlign: 'center',
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						gap: '1.25rem'
					}}>
						<div style={{
							width: '60px',
							height: '60px',
							borderRadius: '50%',
							backgroundColor: 'rgba(239, 68, 68, 0.12)',
							border: '1px solid rgba(239, 68, 68, 0.3)',
							color: 'var(--error)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							marginBottom: '0.25rem'
						}}>
							<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
								<polyline points="3 6 5 6 21 6"></polyline>
								<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
								<path d="M10 11v6"></path>
								<path d="M14 11v6"></path>
								<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
							</svg>
						</div>

						<div>
							<h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff', marginBottom: '0.5rem' }}>
								Delete Invoice
							</h3>
							<p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
								Are you sure you want to delete invoice <strong>{normalizeInvoiceNumber(deleteConfirm.invoiceNumber, deleteConfirm.billDate) || `INV-${String(deleteConfirm.id).padStart(4, '0')}`}</strong>? This action cannot be undone.
							</p>
						</div>

						<div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
							<button
								type="button"
								className="btn btn-secondary"
								style={{ flex: 1, padding: '0.6rem', fontSize: '0.85rem', borderRadius: '8px', width: 'auto' }}
								onClick={() => setDeleteConfirm(null)}
							>
								Cancel
							</button>
							<button
								type="button"
								className="btn btn-primary"
								style={{
									flex: 1,
									padding: '0.6rem',
									fontSize: '0.85rem',
									borderRadius: '8px',
									backgroundColor: 'var(--error)',
									borderColor: 'var(--error)',
									color: '#ffffff',
									fontWeight: '700',
									width: 'auto'
								}}
								onClick={async () => {
									if (onDeleteBill) {
										await onDeleteBill(deleteConfirm.id);
									}
									setDeleteConfirm(null);
								}}
							>
								Yes, Delete
							</button>
						</div>
					</div>
				</div>,
				document.body
			)}

			{/* Developer Footer */}
			<div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '1rem' }}>
				Designed and Developed by <a href="mailto:dhinakaran15022000@gmail.com" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold' }}>Dhinakaran Sekar</a>
			</div>
		</div>
	);
}
