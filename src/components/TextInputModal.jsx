import React, { useState, useEffect, useRef } from 'react';
import './TextInputModal.scss';

const TextInputModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  placeholder = '', 
  defaultValue = '',
  confirmText = 'OK',
  cancelText = 'Cancel'
}) => {
  const [inputValue, setInputValue] = useState(defaultValue);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue);
      // Focus the input after a small delay to ensure the modal is rendered
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 100);
    }
  }, [isOpen, defaultValue]);

  const handleConfirm = () => {
    if (inputValue.trim()) {
      onConfirm(inputValue.trim());
      setInputValue('');
    }
  };

  const handleCancel = () => {
    onClose();
    setInputValue('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="TextInputModalOverlay" onClick={handleCancel}>
      <div className="TextInputModalContent" onClick={(e) => e.stopPropagation()}>
        <div className="TextInputModalHeader">
          <h3>{title}</h3>
        </div>
        <div className="TextInputModalBody">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            className="TextInputModalInput"
          />
        </div>
        <div className="TextInputModalFooter">
          <button 
            onClick={handleCancel}
            className="TextInputModalButton TextInputModalButtonCancel"
          >
            {cancelText}
          </button>
          <button 
            onClick={handleConfirm}
            className="TextInputModalButton TextInputModalButtonConfirm"
            disabled={!inputValue.trim()}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TextInputModal; 