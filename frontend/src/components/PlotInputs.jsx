import { useState } from 'react';
import { HiPlus, HiTrash } from 'react-icons/hi';
import { cornerName, edgeName, fromFeet, PLOT_SHAPES, toFeet } from '../utils/plotProject';

export const formatMeasure = (value) => value == null ? '' : Number(value.toFixed(8)).toString();

export function PlotNumber({ label, value, onChange, unit, min, max, step = 'any', onCommit }) {
  const [draft, setDraft] = useState(null);
  const displayValue = unit ? fromFeet(value ?? 0, unit) : value;
  const read = (input) => Number.isFinite(input.valueAsNumber) ? (unit ? toFeet(input.valueAsNumber, unit) : input.valueAsNumber) : null;

  return (
    <label className="plot-field">
      <span>{label}{unit && <small>{unit}</small>}</span>
      <input
        type="number"
        value={draft ?? (value == null ? '' : formatMeasure(displayValue))}
        min={min}
        max={max}
        step={step}
        onFocus={(event) => setDraft(event.target.value)}
        onChange={(event) => {
          setDraft(event.target.value);
          onChange?.(read(event.target));
        }}
        onBlur={(event) => {
          if (draft !== null && draft !== (value == null ? '' : formatMeasure(displayValue))) onCommit?.(read(event.target));
          setDraft(null);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

export function PlotSelect({ label, value, onChange, children }) {
  return (
    <label className="plot-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
    </label>
  );
}

const SIDE_NAMES = { front: 'Front side length', back: 'Back side length', left: 'Left side length', right: 'Right side length' };
const CORNER_ANGLES = ['frontLeft', 'frontRight', 'backRight', 'backLeft'];

export function MeasurementInputs({ plot, onChange, onShapeChange }) {
  const { shape, sides, angles, diagonal, diagonalLayout, notch, unit } = plot;
  const sideKeys = shape === 'triangle' ? ['front', 'left', 'right'] : ['front', 'back', 'left', 'right'];
  return (
    <div className="plot-form-flow">
      <PlotSelect label="Plot shape" value={shape} onChange={onShapeChange}>
        {Object.entries(PLOT_SHAPES).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
      </PlotSelect>
      <div className="plot-field-grid">
        {sideKeys.map((key) => (
          <PlotNumber key={key} label={SIDE_NAMES[key]} value={sides[key]} unit={unit} min="0" onChange={(value) => onChange({ sides: { ...sides, [key]: value } })} />
        ))}
      </div>
      {shape !== 'triangle' && <p className="plot-note">Enter the plotted sides in order A–B (front), B–C (right), C–D (back), D–A (left){shape === 'l-shape' ? ' for a four-corner plot.' : '.'}</p>}
      {shape === 'l-shape' ? (
        <>
          <div className="plot-field-grid">
            {['width', 'depth'].map((key) => (
              <PlotNumber key={key} label={`Notch ${key}`} value={notch?.[key]} unit={unit} min="0" onChange={(value) => onChange({ notch: { ...notch, [key]: value } })} />
            ))}
          </div>
          <p className="plot-note">For a right-angled L, enter the full front and left lengths and the rear-right notch dimensions. Back and right lengths can be entered as checks. Use coordinates or drawing for other L-shaped plots.</p>
        </>
      ) : (
        <details className="plot-details" open={shape === 'irregular' || undefined}>
          <summary>Angles and diagonals</summary>
          <div className="plot-details-content">
            <div className="plot-field-grid">
              {CORNER_ANGLES.slice(0, shape === 'triangle' ? 3 : 4).map((key, index) => (
                <PlotNumber key={key} label={`Corner ${cornerName(index)} (°)`} value={angles[key]} min="0" max="360" onChange={(value) => onChange({ angles: { ...angles, [key]: value } })} />
              ))}
            </div>
            {shape !== 'triangle' && (
              <>
                <div className="plot-field-grid">
                  {['ac', 'bd'].map((key) => (
                    <PlotNumber key={key} label={`Diagonal ${key.toUpperCase().split('').join('–')}`} unit={unit} value={diagonal[key]} min="0" onChange={(value) => onChange({ diagonal: { ...diagonal, [key]: value } })} />
                  ))}
                </div>
                <PlotSelect label="Corners B and D relative to diagonal A–C" value={diagonalLayout} onChange={(value) => onChange({ diagonalLayout: value })}>
                  <option value="auto">Determine from measurements</option>
                  <option value="opposite">Opposite sides of A–C</option>
                  <option value="same">Same side of A–C</option>
                </PlotSelect>
              </>
            )}
            <p className="plot-note">Enter any measured angles or diagonals. Angles above 180° describe an inward corner.</p>
          </div>
        </details>
      )}
      {shape === 'trapezoid' && <p className="plot-note">The front and back are the parallel edges.</p>}
      {shape === 'triangle' && <p className="plot-note">Front is A–B, right is B–C and left is C–A.</p>}
    </div>
  );
}

export function SurveyInputs({ points, unit, onChange, onRemove, onAdd }) {
  return (
    <div className="plot-form-flow">
      <p className="plot-note">Enter planar survey coordinates in boundary order, clockwise or counterclockwise. Easting and northing may be negative.</p>
      <div className="plot-coordinate-list">
        {points.map((point, index) => (
          <div className="plot-coordinate-row" key={index}>
            <span className="plot-corner-name">{cornerName(index)}</span>
            <PlotNumber label={`Easting ${cornerName(index)}`} unit={unit} value={point.x} onChange={(value) => onChange(index, { ...point, x: value })} />
            <PlotNumber label={`Northing ${cornerName(index)}`} unit={unit} value={point.y == null ? null : -point.y} onChange={(value) => onChange(index, { ...point, y: value == null ? null : -value })} />
            <button type="button" className="plot-icon-button" aria-label={`Remove corner ${cornerName(index)}`} onClick={() => onRemove(index)}><HiTrash size={18} /></button>
          </div>
        ))}
      </div>
      <button type="button" className="plot-button" onClick={onAdd}><HiPlus size={17} /> Add survey corner</button>
    </div>
  );
}

export function BoundaryInputs({ metrics, unit, onEdgeChange, onAngleChange }) {
  return (
    <details className="plot-details">
      <summary>Edit side lengths and corner angles</summary>
      <div className="plot-details-content">
        <p className="plot-note">Apply a value with Enter or by leaving the field. Coordinate edits use the adjacent point to satisfy the new measurement and recalculate the boundary.</p>
        <div className="plot-coordinate-list">
          {metrics.sides.map((length, index) => (
            <div key={index} className="plot-field-grid">
              <PlotNumber label={`Side ${edgeName(index, metrics.sides.length)}`} unit={unit} value={length} min="0" onCommit={(value) => onEdgeChange(index, value)} />
              <PlotNumber label={`Corner ${cornerName(index)} (°)`} value={metrics.angles[index]} min="0" max="360" onCommit={(value) => onAngleChange(index, value)} />
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
