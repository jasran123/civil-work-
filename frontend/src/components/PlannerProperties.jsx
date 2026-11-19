import { useEffect, useState } from 'react';
import { HiOutlineAdjustmentsHorizontal, HiOutlineCube, HiOutlinePaintBrush, HiOutlineSquare3Stack3D, HiOutlineSun } from 'react-icons/hi2';
import { useDesign } from '../context/DesignContext';
import FloorPlanInspector from './FloorPlanInspector';
import { getFloorDetails } from '../utils/projectState';

const TABS = [['object', 'Object', HiOutlineCube], ['materials', 'Finishes', HiOutlinePaintBrush], ['lighting', 'Lighting', HiOutlineSun], ['floors', 'Floors', HiOutlineSquare3Stack3D]];

function Select({ label, value, options, onChange }) {
  return <label className="workspace-field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>
    {options.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
  </select></label>;
}

function Range({ label, value, min, max, step = 1, onChange, show }) {
  const { beginHistoryGroup, endHistoryGroup } = useDesign();
  return <label className="workspace-range">
    <span>{label}<output>{show(value)}</output></span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))}
      onPointerDown={beginHistoryGroup} onPointerUp={endHistoryGroup} onPointerCancel={endHistoryGroup} onBlur={endHistoryGroup} />
  </label>;
}

function Toggle({ label, checked, onChange }) {
  return <label className="workspace-toggle"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}

function ColorField({ label, value, onChange, palette }) {
  return <div className="workspace-color-field">
    <label><span>{label}</span><input type="color" value={value} onChange={(event) => onChange(event.target.value)} /></label>
    {palette && <div className="workspace-palette" role="group" aria-label={`${label} presets`}>
      {palette.map(([name, color, material]) => <button key={color} type="button" aria-label={name} title={name} aria-pressed={value.toLowerCase() === color} style={{ '--swatch': color }} onClick={() => onChange(color, material)} />)}
    </div>}
  </div>;
}

const WALL_PALETTE = [['Pure white', '#ffffff'], ['Warm cream', '#faf5ee'], ['Soft slate', '#e2e8f0'], ['Terracotta', '#fecaca'], ['Pale sage', '#d1fae5'], ['Royal navy', '#1e293b']];
const FLOOR_PALETTE = [['Teak wood', '#d2b48c', 'wood'], ['Italian marble', '#f8fafc', 'tile'], ['Dark oak', '#78350f', 'wood'], ['Granite slate', '#475569', 'tile'], ['Porcelain', '#fef3c7', 'tile']];
const SURFACE_OPTIONS = [['plaster', 'Matte plaster'], ['concrete', 'Architectural concrete'], ['wood', 'Natural wood']];

function Finishes({ design, updateDesign, settings, updateSettings }) {
  return <>
    <section className="workspace-form-section">
      <h3>Walls &amp; floors</h3>
      <Select label="Wall material" value={design.wallMaterial || 'plaster'} options={SURFACE_OPTIONS} onChange={(wallMaterial) => updateDesign({ wallMaterial })} />
      <ColorField label="Wall color" value={design.wallColor || '#ffffff'} palette={WALL_PALETTE} onChange={(wallColor) => updateDesign({ wallColor })} />
      <Select label="Floor material" value={design.floorMaterial || 'wood'} options={[["wood", "Wood planks"], ["tile", "Porcelain tile"], ["concrete", "Polished concrete"]]} onChange={(floorMaterial) => updateDesign({ floorMaterial })} />
      <ColorField label="Floor color" value={design.floorColor || '#d2b48c'} palette={FLOOR_PALETTE} onChange={(floorColor, floorMaterial) => updateDesign({ floorColor, ...(floorMaterial ? { floorMaterial } : {}) })} />
      <Select label="Ceiling material" value={design.ceilingMaterial || 'plaster'} options={SURFACE_OPTIONS} onChange={(ceilingMaterial) => updateDesign({ ceilingMaterial })} />
      <ColorField label="Ceiling color" value={design.ceilingColor || '#f5f2ed'} onChange={(ceilingColor) => updateDesign({ ceilingColor })} />
    </section>
    <section className="workspace-form-section">
      <h3>Roof &amp; furniture</h3>
      <Select label="Roof style" value={design.roofStyle || 'flat'} options={[["flat", "Flat terrace"], ["gabled", "Gabled roof"]]} onChange={(roofStyle) => updateDesign({ roofStyle })} />
      <ColorField label="Roof color" value={design.roofColor || '#8b4513'} onChange={(roofColor) => updateDesign({ roofColor })} />
      <Select label="Furniture theme" value={settings.furnitureTheme} options={[["modern", "Modern"], ["scandi", "Nordic"], ["luxury", "Walnut"]]} onChange={(furnitureTheme) => updateSettings({ furnitureTheme })} />
      <Toggle label="Show furniture" checked={design.showFurniture !== false} onChange={(showFurniture) => updateDesign({ showFurniture })} />
    </section>
  </>;
}

function Lighting({ settings, updateSettings }) {
  return <>
    <section className="workspace-form-section">
      <h3>Daylight &amp; exposure</h3>
      <div className="workspace-segment" role="group" aria-label="Lighting mode">
        {[['day', 'Day'], ['sunset', 'Sunset'], ['night', 'Night']].map(([mode, name]) => <button type="button" key={mode} aria-pressed={settings.mode === mode} onClick={() => updateSettings({ mode })}>{name}</button>)}
      </div>
      <Range label="Brightness" value={settings.brightness} min={0.65} max={1.65} step={0.05} show={(value) => `${Math.round(value * 100)}%`} onChange={(brightness) => updateSettings({ brightness })} />
      <Range label="Sunlight intensity" value={settings.sunIntensity} min={0} max={4.5} step={0.1} show={(value) => value.toFixed(1)} onChange={(sunIntensity) => updateSettings({ sunIntensity })} />
      <Range label="Sunlight direction" value={settings.sunAzimuth} min={0} max={359} show={(value) => `${value}°`} onChange={(sunAzimuth) => updateSettings({ sunAzimuth })} />
      <Range label="Sun elevation" value={settings.sunAltitude} min={8} max={85} show={(value) => `${value}°`} onChange={(sunAltitude) => updateSettings({ sunAltitude })} />
    </section>
    <section className="workspace-form-section">
      <h3>Shadows</h3>
      <Select label="Shadow quality" value={settings.shadowQuality} options={[["off", "Off"], ["soft", "Soft"], ["high", "High detail"]]} onChange={(shadowQuality) => updateSettings({ shadowQuality })} />
      <Toggle label="Ambient occlusion" checked={settings.ambientOcclusion} onChange={(ambientOcclusion) => updateSettings({ ambientOcclusion })} />
    </section>
  </>;
}

function Floors({ activeFloor, currentFloorName, settings, updateSettings, showFullModel }) {
  const { design, setFloorDetails } = useDesign();
  const height = getFloorDetails(design)[activeFloor]?.height || 10;
  const [draft, setDraft] = useState(null);
  useEffect(() => { setDraft(null); }, [activeFloor]);
  return <>
    <section className="workspace-form-section">
      <h3>{currentFloorName}</h3>
      <label className="workspace-field"><span>Floor-to-floor height (ft)</span><input type="number" min={7} max={24} step={0.25} value={draft ?? height}
        onChange={(event) => setDraft(event.target.value)} onBlur={() => {
          if (draft != null && Number.isFinite(Number(draft)) && Number(draft) >= 7 && Number(draft) <= 24) {
            setFloorDetails(activeFloor, { height: Number(draft) });
          }
          setDraft(null);
        }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} /></label>
    </section>
    <section className="workspace-form-section">
      <h3>Model visibility</h3>
      <div className="workspace-segment" role="group" aria-label="Visible floors">
        <button type="button" aria-pressed={settings.showAllFloors} onClick={showFullModel}>Full building</button>
        <button type="button" aria-pressed={!settings.showAllFloors} onClick={() => updateSettings({ showAllFloors: false })}>Selected floor</button>
      </div>
      <Select label="Roof visibility" value={settings.roofMode} options={[["solid", "Show roof"], ["transparent", "Transparent roof"], ["hidden", "Hide roof"]]} onChange={(roofMode) => updateSettings({ roofMode })} />
      <Toggle label="Show walls" checked={settings.showWalls} onChange={(showWalls) => updateSettings({ showWalls })} />
      <Toggle label="Cutaway walls" checked={settings.cutaway} onChange={(cutaway) => updateSettings({ cutaway })} />
    </section>
  </>;
}

export default function PlannerProperties({ section, setSection, activeFloor, currentFloorName, selectedObject, onSelectionChange, settings, updateSettings, showFullModel, theme }) {
  const { design, updateDesign } = useDesign();
  return <aside className="workspace-properties" aria-label="Properties panel">
    <h2><HiOutlineAdjustmentsHorizontal size={18} /> Properties</h2>
    <div className="workspace-property-tabs" role="group" aria-label="Property settings">
      {TABS.map(([key, label, Icon]) => <button type="button" key={key} aria-pressed={section === key} onClick={() => setSection(key)}><Icon size={17} />{label}</button>)}
    </div>
    <div className="workspace-properties-content">
      {section === 'object' && <FloorPlanInspector activeFloor={activeFloor} selectedObject={selectedObject} onSelectionChange={onSelectionChange} theme={theme} />}
      {section === 'materials' && <Finishes design={design} updateDesign={updateDesign} settings={settings} updateSettings={updateSettings} />}
      {section === 'lighting' && <Lighting settings={settings} updateSettings={updateSettings} />}
      {section === 'floors' && <Floors activeFloor={activeFloor} currentFloorName={currentFloorName} settings={settings} updateSettings={updateSettings} showFullModel={showFullModel} />}
    </div>
  </aside>;
}
