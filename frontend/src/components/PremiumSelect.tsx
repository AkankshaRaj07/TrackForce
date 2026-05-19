import React from 'react';
import { ChevronDown, CheckCircle2 } from 'lucide-react';
import './PremiumSelect.css';

interface Option {
  label: string;
  value: string;
}

interface PremiumSelectProps {
  label?: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const PremiumSelect: React.FC<PremiumSelectProps> = ({ 
  label, 
  value, 
  options, 
  onChange, 
  required, 
  disabled, 
  placeholder = 'Select option...',
  className = ''
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`premium-select-container ${disabled ? 'disabled' : ''} ${className}`} ref={containerRef}>
      {label && <label className="premium-select-label">{label}</label>}
      <div 
        className={`premium-select-trigger ${isOpen ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        {!disabled && <ChevronDown size={18} className={`chevron ${isOpen ? 'rotate' : ''}`} />}
      </div>
      
      {isOpen && !disabled && (
        <div className="premium-select-menu">
          {options.map((option) => (
            <div 
              key={option.value}
              className={`premium-select-item ${value === option.value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
              {value === option.value && <CheckCircle2 size={14} className="check-icon" />}
            </div>
          ))}
        </div>
      )}
      <input type="hidden" value={value} required={required} />
    </div>
  );
};

export default PremiumSelect;
