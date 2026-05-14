import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Landmark, User, Calendar, CreditCard } from 'lucide-react';
import './PayslipModal.css';

interface PayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

const PayslipModal: React.FC<PayslipModalProps> = ({ isOpen, onClose, data }) => {
  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="payslip-modal-overlay">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="payslip-card-premium"
          >
            <div className="payslip-header-actions no-print">
              <button className="btn-icon" onClick={handlePrint} title="Print Payslip">
                <Printer size={20} />
              </button>
              <button className="btn-icon close" onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            <div className="payslip-content-printable" id="printable-payslip">
              <div className="payslip-brand">
                <div className="brand-logo">TF</div>
                <div className="brand-info">
                  <h2>TRACKFORCE ENTERPRISE</h2>
                  <p>Workforce & Payroll Intelligence</p>
                </div>
                <div className="payslip-label">PAYMENT SLIP</div>
              </div>

              <div className="payslip-grid">
                <section className="payslip-section">
                  <div className="section-title"><User size={14} /> EMPLOYEE DETAILS</div>
                  <div className="info-row">
                    <span className="label">Name:</span>
                    <span className="value">{data.employee?.firstName} {data.employee?.lastName}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Employee ID:</span>
                    <span className="value">{data.employee?.employeeId}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Designation:</span>
                    <span className="value">{data.employee?.designation}</span>
                  </div>
                </section>

                <section className="payslip-section">
                  <div className="section-title"><Calendar size={14} /> PAY PERIOD</div>
                  <div className="info-row">
                    <span className="label">Start Date:</span>
                    <span className="value">{data.periodStart ? new Date(data.periodStart).toLocaleDateString() : 'Current Month'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">End Date:</span>
                    <span className="value">{data.periodEnd ? new Date(data.periodEnd).toLocaleDateString() : new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Status:</span>
                    <span className="value status-badge">{data.status}</span>
                  </div>
                </section>

                <section className="payslip-section full-width">
                  <div className="section-title"><Landmark size={14} /> BANK ACCOUNT DETAILS</div>
                  <div className="info-grid">
                    <div className="info-row">
                      <span className="label">Bank:</span>
                      <span className="value">{data.employee?.bankName || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Account Number:</span>
                      <span className="value">{data.employee?.accountNumber || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Account Holder:</span>
                      <span className="value">{data.employee?.accountHolderName || `${data.employee?.firstName} ${data.employee?.lastName}`}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Swift/Routing:</span>
                      <span className="value">{data.employee?.swiftCode || 'N/A'}</span>
                    </div>
                  </div>
                </section>

                <section className="payslip-section full-width earnings-section">
                  <div className="section-title"><CreditCard size={14} /> EARNINGS BREAKDOWN</div>
                  <table className="earnings-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Rate</th>
                        <th>Hours</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Regular Hours</td>
                        <td>{data.employee?.hourlyRate?.toLocaleString()} ₫</td>
                        <td>{data.regularHours}</td>
                        <td>{(parseFloat(data.regularHours) * (data.employee?.hourlyRate || 0)).toLocaleString()} ₫</td>
                      </tr>
                      {parseFloat(data.overtimeHours) > 0 && (
                        <tr>
                          <td>Overtime ({data.employee?.overtimeType === 'MULTIPLIER' ? `${data.employee?.overtimeValue}x` : 'Fixed'})</td>
                          <td>
                            {data.employee?.overtimeType === 'MULTIPLIER' 
                              ? ((data.employee?.hourlyRate || 0) * (data.employee?.overtimeValue || 1.5)).toLocaleString() 
                              : (data.employee?.overtimeValue || 0).toLocaleString()} ₫
                          </td>
                          <td>{data.overtimeHours}</td>
                          <td>{(parseFloat(data.earnings) - (parseFloat(data.regularHours) * (data.employee?.hourlyRate || 0))).toLocaleString()} ₫</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="net-pay-row">
                        <td colSpan={3}>NET PAYOUT</td>
                        <td className="final-amount">{parseFloat(data.earnings).toLocaleString()} ₫</td>
                      </tr>
                    </tfoot>
                  </table>
                </section>
              </div>

              <div className="payslip-footer">
                <p>This is a computer-generated document and does not require a physical signature.</p>
                <div className="footer-meta">
                  <span>Generated on: {new Date().toLocaleString()}</span>
                  <span>ID: {data.id?.substring(0,8).toUpperCase()}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PayslipModal;
