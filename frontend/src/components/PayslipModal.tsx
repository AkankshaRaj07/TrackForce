import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer } from 'lucide-react';
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
              <div className="receipt-container">
                <header className="receipt-header">
                  <h1>TRACKFORCE</h1>
                  <p>SALARY RECEIPT</p>
                  <div className="receipt-divider"></div>
                </header>

                <div className="receipt-body">
                  <div className="receipt-section">
                    <div className="receipt-row">
                      <span>Employee:</span>
                      <span>{data.employee?.firstName} {data.employee?.lastName}</span>
                    </div>
                    <div className="receipt-row">
                      <span>ID:</span>
                      <span>{data.employee?.employeeId}</span>
                    </div>
                    <div className="receipt-row">
                      <span>Period:</span>
                      <span>{data.periodStart ? new Date(data.periodStart).toLocaleDateString() : 'Current'} - {data.periodEnd ? new Date(data.periodEnd).toLocaleDateString() : 'Now'}</span>
                    </div>
                  </div>

                  <div className="receipt-divider dashed"></div>

                  <div className="receipt-section">
                    <div className="receipt-row">
                      <span>Regular Hours ({data.regularHours}h)</span>
                      <span>{(parseFloat(data.regularHours) * (data.employee?.hourlyRate || 0)).toLocaleString()} ₫</span>
                    </div>
                    {parseFloat(data.overtimeHours) > 0 && (
                      <div className="receipt-row">
                        <span>Overtime ({data.overtimeHours}h)</span>
                        <span>{(parseFloat(data.earnings) - (parseFloat(data.regularHours) * (data.employee?.hourlyRate || 0))).toLocaleString()} ₫</span>
                      </div>
                    )}
                  </div>

                  <div className="receipt-divider dashed"></div>

                  <div className="receipt-total">
                    <span>NET TOTAL:</span>
                    <span>{parseFloat(data.earnings).toLocaleString()} ₫</span>
                  </div>

                  <div className="receipt-footer">
                    <p>Paid to: {data.employee?.bankName || 'Direct Deposit'}</p>
                    <p>Account: ****{data.employee?.accountNumber?.slice(-4) || 'N/A'}</p>
                    <div className="receipt-divider"></div>
                    <p className="timestamp">Generated: {new Date().toLocaleString()}</p>
                  </div>
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
