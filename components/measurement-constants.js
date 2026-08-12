// Standard measurement fields for fashion
export const MEASUREMENT_FIELDS = [
  { key: 'bust', label: 'Bust / Chest', unit: 'in' },
  { key: 'waist', label: 'Waist', unit: 'in' },
  { key: 'hip', label: 'Hip', unit: 'in' },
  { key: 'shoulder', label: 'Shoulder', unit: 'in' },
  { key: 'sleeve_length', label: 'Sleeve length', unit: 'in' },
  { key: 'full_length', label: 'Full length', unit: 'in' },
  { key: 'chest', label: 'Chest', unit: 'in' },
  { key: 'neck', label: 'Neck', unit: 'in' },
  { key: 'inseam', label: 'Inseam', unit: 'in' },
]

// Default empty measurements object
export const DEFAULT_MEASUREMENTS = {
  // Standard fields set to null
  ...Object.fromEntries(MEASUREMENT_FIELDS.map(f => [f.key, null])),
  // Custom fields stored as key-value pairs
  custom: {},
  // Free-text notes
  notes: '',
}

/**
 * Helper to get a summary string of non-null measurements
 * e.g. "Bust: 36, Waist: 28, Hip: 40"
 */
export function getMeasurementSummary(measurements) {
  if (!measurements) return ''
  const parts = []
  MEASUREMENT_FIELDS.forEach(f => {
    const val = measurements[f.key]
    if (val && val !== '') {
      parts.push(`${f.label}: ${val}`)
    }
  })
  // Include custom fields
  if (measurements.custom) {
    Object.entries(measurements.custom).forEach(([key, val]) => {
      if (val && val !== '') {
        parts.push(`${key}: ${val}`)
      }
    })
  }
  return parts.join(', ')
}

/**
 * Check if measurements have any data (including custom)
 */
export function hasMeasurements(measurements) {
  if (!measurements) return false
  for (const f of MEASUREMENT_FIELDS) {
    if (measurements[f.key] && measurements[f.key] !== '') return true
  }
  if (measurements.custom && Object.keys(measurements.custom).length > 0) return true
  if (measurements.notes && measurements.notes !== '') return true
  return false
}
