'use client'

import { useState } from 'react'
import { Icon } from './Icon'
import { MEASUREMENT_FIELDS, DEFAULT_MEASUREMENTS } from './measurement-constants'

export function MeasurementForm({
  measurements = DEFAULT_MEASUREMENTS,
  onChange,
  readOnly = false,
  className = '',
  showNotes = true,
  label = 'Measurements',
}) {
  // Local state for the form values
  const [formValues, setFormValues] = useState(() => ({
    ...DEFAULT_MEASUREMENTS,
    ...measurements,
    custom: { ...(measurements.custom || {}) },
  }))

  // State for the custom inline form
  const [isAddingCustom, setIsAddingCustom] = useState(false)
  const [newCustomName, setNewCustomName] = useState('')
  const [newCustomValue, setNewCustomValue] = useState('')
  const [customError, setCustomError] = useState('')

  // Update parent when local state changes
  const updateParent = (newValues) => {
    setFormValues(newValues)
    onChange?.(newValues)
  }

  // Handle standard field change
  const handleFieldChange = (key, value) => {
    const updated = { ...formValues, [key]: value }
    updateParent(updated)
  }

  // Handle notes change
  const handleNotesChange = (value) => {
    const updated = { ...formValues, notes: value }
    updateParent(updated)
  }

  // Handle saving the custom field from the inline form
  const handleSaveCustom = () => {
    if (!newCustomName.trim()) {
      setCustomError('Measurement name is required.')
      return
    }
    
    const key = newCustomName.trim().toLowerCase().replace(/\s+/g, '_')
    
    // Avoid overwriting existing keys
    if (formValues.custom[key] !== undefined) {
      setCustomError(`"${newCustomName}" already exists.`)
      return
    }

    const updated = {
      ...formValues,
      custom: { ...formValues.custom, [key]: newCustomValue || '0' },
    }
    
    updateParent(updated)
    
    // Reset inline form
    setNewCustomName('')
    setNewCustomValue('')
    setCustomError('')
    setIsAddingCustom(false)
  }

  const handleCancelCustom = () => {
    setNewCustomName('')
    setNewCustomValue('')
    setCustomError('')
    setIsAddingCustom(false)
  }

  // Handle custom field removal
  const handleRemoveCustom = (key) => {
    const updated = {
      ...formValues,
      custom: { ...formValues.custom },
    }
    delete updated.custom[key]
    updateParent(updated)
  }

  // Handle custom field value change
  const handleCustomChange = (key, value) => {
    const updated = {
      ...formValues,
      custom: { ...formValues.custom, [key]: value },
    }
    updateParent(updated)
  }

  // Check if there are custom fields
  const customKeys = Object.keys(formValues.custom || {})
  const hasCustomValues = customKeys.length > 0

  return (
    <div className={`measurement-form ${className}`}>
      {label && <h4 className="measurement-form-title">{label}</h4>}

      {/* Standard fields grid */}
      <div className="measurement-grid">
        {MEASUREMENT_FIELDS.map((field) => (
          <div key={field.key} className="measurement-field">
            <label htmlFor={`measurement-${field.key}`}>
              {field.label}
              <span className="unit">{field.unit}</span>
            </label>
            <input
              id={`measurement-${field.key}`}
              type="number"
              step="0.1"
              min="0"
              value={formValues[field.key] ?? ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              disabled={readOnly}
              placeholder="—"
              className={readOnly ? 'read-only' : ''}
              inputMode="decimal"
            />
          </div>
        ))}
      </div>

      {/* Custom measurements section */}
      <div className="measurement-custom-section">
        <div className="measurement-custom-header">
          <span className="measurement-custom-label">Custom measurements</span>
          {!readOnly && !isAddingCustom && (
            <button
              type="button"
              className="measurement-add-custom"
              onClick={() => setIsAddingCustom(true)}
            >
              <Icon name="plus" size={14} stroke="currentColor" />
              Add custom
            </button>
          )}
        </div>

        {/* INLINE CUSTOM FORM (Replaces window.prompt) */}
        {isAddingCustom && (
          <div className="inline-custom-form">
            <div className="inline-custom-inputs">
              <input
                type="text"
                placeholder="Name (e.g. Thigh)"
                value={newCustomName}
                onChange={(e) => { setNewCustomName(e.target.value); setCustomError(''); }}
                className="inline-custom-input"
                autoFocus
              />
              <input
                type="number"
                step="0.1"
                placeholder="Value"
                value={newCustomValue}
                onChange={(e) => setNewCustomValue(e.target.value)}
                className="inline-custom-input value-input"
                inputMode="decimal"
              />
            </div>
            <div className="inline-custom-actions">
              <button type="button" onClick={handleCancelCustom} className="inline-custom-cancel">Cancel</button>
              <button type="button" onClick={handleSaveCustom} className="inline-custom-save">Save</button>
            </div>
            {customError && <p className="inline-custom-error">{customError}</p>}
          </div>
        )}

        {hasCustomValues ? (
          <div className="measurement-custom-list">
            {customKeys.map((key) => (
              <div key={key} className="measurement-custom-item">
                <span className="measurement-custom-key">{key.replace(/_/g, ' ')}</span>
                {readOnly ? (
                  <span className="measurement-custom-value">{formValues.custom[key]}</span>
                ) : (
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formValues.custom[key] ?? ''}
                    onChange={(e) => handleCustomChange(key, e.target.value)}
                    placeholder="—"
                    inputMode="decimal"
                  />
                )}
                {!readOnly && (
                  <button
                    type="button"
                    className="measurement-remove-custom"
                    onClick={() => handleRemoveCustom(key)}
                  >
                    <Icon name="x" size={14} stroke="currentColor" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          !isAddingCustom && (
            <div className="measurement-custom-empty">
              {readOnly ? 'No custom measurements' : 'No custom measurements added yet'}
            </div>
          )
        )}
      </div>

      {/* Notes section */}
      {showNotes && (
        <div className="measurement-notes">
          <label htmlFor="measurement-notes">Additional notes</label>
          <textarea
            id="measurement-notes"
            value={formValues.notes ?? ''}
            onChange={(e) => handleNotesChange(e.target.value)}
            disabled={readOnly}
            placeholder="Fitting notes, special requests…"
            rows={2}
            className={readOnly ? 'read-only' : ''}
          />
        </div>
      )}
    </div>
  )
}
