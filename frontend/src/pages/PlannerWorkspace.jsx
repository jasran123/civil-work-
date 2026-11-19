import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineArrowDownTray, HiOutlineArrowPath, HiOutlineArrowUturnLeft, HiOutlineArrowUturnRight,
  HiOutlineArrowTopRightOnSquare, HiOutlineChartBarSquare, HiOutlineCheck, HiOutlineChevronDown, HiOutlineCube,
  HiOutlineCursorArrowRays, HiOutlineDocumentArrowDown, HiOutlineHomeModern, HiOutlineMagnifyingGlassMinus,
  HiOutlineMagnifyingGlassPlus, HiOutlineMap, HiOutlineMoon, HiOutlinePencilSquare, HiOutlinePhoto, HiOutlinePlus,
  HiOutlineRectangleGroup, HiOutlineSquare2Stack, HiOutlineSquares2X2, HiOutlineSun, HiOutlineViewColumns, HiOutlineWindow,
} from 'react-icons/hi2';
import PlannerProperties from '../components/PlannerProperties';
import { useAuth } from '../context/AuthContext';
import { useDesign } from '../context/DesignContext';
import FloorPlanGenerator from './FloorPlanGenerator';
import { CAMERA_PRESETS, DEFAULT_VIEW_SETTINGS } from '../three/architecturalView';
import { generateFloorPlans } from '../utils/floorPlanGenerator';
import { getPlotResult } from '../utils/plotProject';
import { getFloorDetails, getFloorLayouts } from '../utils/projectState';
import './PlannerWorkspace.css';

const Designer3D = lazy(() => import('./Designer3D'));
const VIEWS = [['2d', '2D View', HiOutlineSquares2X2], ['3d', '3D View', HiOutlineCube], ['split', 'Split View', HiOutlineViewColumns]];
const TOOLS = [
  ['select', 'Select tool', HiOutlineCursorArrowRays, 'V'],
  ['wall', 'Draw wall', HiOutlinePencilSquare, 'W'],
  ['room', 'Add room', HiOutlinePlus, 'R'],
  ['door', 'Door', HiOutlineRectangleGroup],
  ['window', 'Window', HiOutlineWindow],
  ['staircase', 'Staircase', HiOutlineSquare2Stack],
  ['furniture', 'Furniture', HiOutlineCube],
];
const FLOOR_NAMES = ['Ground Floor', 'First Floor', 'Second Floor', 'Third Floor', 'Fourth Floor', 'Fifth Floor'];
const floorName = (index) => FLOOR_NAMES[index] || `Floor ${index}`;

function IconButton({ icon: Icon, label, onClick, disabled, pressed }) {
  return <button className="workspace-icon-button" type="button" title={label} aria-label={label} aria-pressed={pressed} disabled={disabled} onClick={onClick}><Icon size={18} /></button>;
}

function ProjectName({ name, onCommit }) {
  const [draft, setDraft] = useState(null);
  return <label className="workspace-project-name">
    <span>Project name</span>
    <input value={draft ?? name} maxLength={80} onChange={(event) => setDraft(event.target.value)} onBlur={() => {
      if (draft?.trim() && draft.trim() !== name) onCommit(draft.trim());
      setDraft(null);
    }} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} />
  </label>;
}

function Toolbar({ view, changeView, theme, toggleTheme, save, status, saving, options }) {
  const { design, updateDesign, canUndo, canRedo, undo, redo } = useDesign();
  const { user } = useAuth();
  const menu = useRef(null);
  useEffect(() => {
    const closeOutside = (event) => {
      if (menu.current?.open && !menu.current.contains(event.target)) menu.current.open = false;
    };
    const closeEscape = (event) => {
      if (event.key === 'Escape' && menu.current?.open) {
        menu.current.open = false;
        menu.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeEscape); };
  }, []);

  return <header className="workspace-toolbar">
    <div className="workspace-project-group">
      <Link className="workspace-brand" to="/" aria-label="Dream Home 3D home" title="Dream Home 3D"><HiOutlineHomeModern size={23} /></Link>
      <ProjectName name={design.projectName || 'Dream Home'} onCommit={(projectName) => updateDesign({ projectName })} />
      <div className="workspace-history" role="group" aria-label="Edit history">
        <IconButton label="Undo" icon={HiOutlineArrowUturnLeft} onClick={undo} disabled={!canUndo} />
        <IconButton label="Redo" icon={HiOutlineArrowUturnRight} onClick={redo} disabled={!canRedo} />
      </div>
    </div>

    <div className="workspace-segment workspace-view-switch" role="group" aria-label="Workspace view">
      {VIEWS.map(([id, name, Icon]) => <button key={id} type="button" aria-pressed={id === view} onClick={() => changeView(id)}><Icon size={17} />{name}</button>)}
    </div>

    <div className="workspace-project-actions">
      <IconButton icon={theme === 'dark' ? HiOutlineSun : HiOutlineMoon} label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggleTheme} />
      <Link className="workspace-account" to={user ? '/dashboard' : '/login'}>{user ? 'My designs' : 'Sign in'}</Link>
      <details className="workspace-export" ref={menu}>
        <summary className="workspace-button"><HiOutlineArrowDownTray size={17} /> Export <HiOutlineChevronDown size={12} /></summary>
        <div className="workspace-menu" aria-label="Export options">
          {options.map(({ label, action, icon: Icon }) => <button key={label} type="button" onClick={() => { menu.current.open = false; action(); }}><Icon size={17} />{label}</button>)}
        </div>
      </details>
      <button className="workspace-button workspace-button-primary" type="button" onClick={save} disabled={saving}><HiOutlineCheck size={18} />{saving ? 'Saving…' : 'Save project'}</button>
      <span className="workspace-action-status" role="status" hidden={!status}>{status}</span>
    </div>
  </header>;
}

function ToolRail({ tool, selectTool, focus, onDesign, view }) {
  return <aside className="workspace-tool-rail" aria-label="Planner tools">
    <div className="workspace-tool-group">
      <h2>Plan tools</h2>
      {TOOLS.map(([id, label, Icon, shortcut]) => (
        <button key={id} type="button" className="workspace-tool" aria-pressed={tool === id && view !== '3d'} onClick={() => selectTool(id)}>
          <Icon size={18} /><span>{label}</span>{shortcut && <kbd>{shortcut}</kbd>}
        </button>
      ))}
    </div>
    <div className="workspace-tool-group">
      <h2>Design</h2>
      <Link className="workspace-tool" to="/land-measurement"><HiOutlineMap size={18} /><span>Land plot editor</span><HiOutlineArrowTopRightOnSquare size={13} /></Link>
      <button className="workspace-tool" type="button" aria-pressed={focus === 'interior'} onClick={() => onDesign('interior')}><HiOutlineSquares2X2 size={18} /><span>Interior design</span></button>
      <button className="workspace-tool" type="button" aria-pressed={focus === 'exterior'} onClick={() => onDesign('exterior')}><HiOutlineHomeModern size={18} /><span>Exterior design</span></button>
    </div>
    <Link className="workspace-tool workspace-estimate" to="/cost-calculator"><HiOutlineChartBarSquare size={18} /><span>Cost estimate</span><HiOutlineArrowTopRightOnSquare size={13} /></Link>
  </aside>;
}

function BottomBar({ layouts, activeFloor, selectFloor, addFloor, cameraPreset, setCamera, rotate, toggleRotate, zoom, fit, activePane, siteView }) {
  const cameraOptions = Object.entries(CAMERA_PRESETS).filter(([id]) => !siteView || id !== 'walkthrough');
  return <footer className="workspace-bottom">
    <div className="workspace-floor-controls">
      <div className="workspace-floor-tabs" role="group" aria-label="Active floor">
        {layouts.map((_, index) => <button key={index} type="button" aria-pressed={activeFloor === index} onClick={() => selectFloor(index)}>{floorName(index)}</button>)}
      </div>
      <button className="workspace-button" type="button" onClick={addFloor}><HiOutlinePlus size={16} />Add floor</button>
    </div>
    <div className="workspace-camera-controls">
      <div className="workspace-zoom" role="group" aria-label={`${activePane.toUpperCase()} zoom`}>
        <IconButton icon={HiOutlineMagnifyingGlassMinus} label="Zoom out" onClick={() => zoom('out')} disabled={activePane === '3d' && cameraPreset === 'walkthrough'} />
        <IconButton icon={HiOutlineArrowPath} label="Fit view" onClick={fit} />
        <IconButton icon={HiOutlineMagnifyingGlassPlus} label="Zoom in" onClick={() => zoom('in')} disabled={activePane === '3d' && cameraPreset === 'walkthrough'} />
      </div>
      {activePane === '3d' && <>
        <label className="workspace-camera-select"><span>Camera</span><select value={cameraPreset} onChange={(event) => setCamera(event.target.value)}>
          {cameraOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select></label>
        {!siteView && <IconButton icon={HiOutlineArrowPath} label="Auto-rotate 360 degrees" pressed={rotate} onClick={toggleRotate} disabled={cameraPreset === 'walkthrough'} />}
      </>}
    </div>
  </footer>;
}

export default function PlannerWorkspace({ initialView = '2d', theme, toggleTheme }) {
  const { design, updateDesign, setActiveFloor, addFloor, saveProject, exportProject, undo, redo } = useDesign();
  const [view, setView] = useState(initialView);
  const [activePane, setActivePane] = useState(initialView);
  const [tool, setTool] = useState('select');
  const [focus, setFocus] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const [properties, setProperties] = useState(initialView === '3d' ? 'lighting' : 'object');
  const [cameraView, setCameraView] = useState({ preset: 'orbit', revision: 0 });
  const [siteView, setSiteView] = useState(false);
  const [rotate, setRotate] = useState(false);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const actionTimer = useRef(null);
  const planApi = useRef(null);
  const sceneApi = useRef(null);
  const initialized = useRef(false);
  const layouts = getFloorLayouts(design);
  const activeFloor = Math.max(0, Math.min(design.activeFloor ?? 0, layouts.length - 1));
  const currentFloorName = floorName(activeFloor);
  const settings = { ...DEFAULT_VIEW_SETTINGS, ...design.houseView };
  const canShowSite = useMemo(() => Boolean(design.plot && getPlotResult(design.plot).status === 'valid'), [design.plot]);
  const onSite = siteView && canShowSite;

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (design.plot || design.plans?.length || getFloorLayouts(design).some((rooms) => rooms.length) || getFloorDetails(design).some(({ walls, furniture }) => walls.length || furniture.length)) return;
    const plans = generateFloorPlans(design);
    updateDesign({ plans, currentPlanIndex: 0, rooms: plans[0]?.rooms || [] }, { history: false });
  }, [design, updateDesign]);

  useEffect(() => () => clearTimeout(actionTimer.current), []);

  function announce(message) {
    setStatus(message);
    clearTimeout(actionTimer.current);
    actionTimer.current = setTimeout(() => setStatus(''), 4500);
  }

  const updateSettings = (changes) => updateDesign({ houseView: { ...settings, ...changes } });

  function changeView(next) {
    setView(next);
    if (next !== 'split') setActivePane(next);
  }

  function setCamera(preset) {
    if (preset === 'walkthrough') {
      setRotate(false);
      setSiteView(false);
    }
    if (onSite) sceneApi.current?.setCameraView?.(preset);
    setCameraView((previous) => ({ preset, revision: previous.revision + 1 }));
  }

  function selectTool(next) {
    setTool(next);
    setFocus(null);
    setProperties('object');
    if (view === '3d') setView('2d');
    setActivePane('2d');
  }

  function selectObject(object) {
    const floor = object?.floor;
    if (floor != null && floor !== activeFloor) setActiveFloor(floor);
    setSelectedObject(object);
    if (object) setProperties('object');
  }

  function showFullModel() {
    updateSettings({ showAllFloors: true, roofMode: 'solid', cutaway: false, showWalls: true });
    setCamera('orbit');
  }

  function focusDesign(next) {
    setFocus(next);
    setSiteView(false);
    setProperties('materials');
    if (view === '2d') setView('3d');
    setActivePane('3d');
    if (next === 'interior') updateSettings({ showAllFloors: false, roofMode: 'hidden', cutaway: true, showWalls: true });
    else updateSettings({ showAllFloors: true, roofMode: 'solid', cutaway: false, showWalls: true });
    setCamera('orbit');
  }

  function selectFloor(index) {
    setSelectedObject(null);
    if (activeFloor !== index) setActiveFloor(index);
    if (view !== '2d' && settings.showAllFloors) updateSettings({ showAllFloors: false });
  }

  function createFloor() {
    addFloor();
    setSelectedObject(null);
    selectTool('room');
    setProperties('floors');
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const result = await saveProject();
      announce(result.scope === 'account' ? 'Project saved to My Designs' : 'Project saved in this browser');
    } catch {
      announce('Could not save the project. Please try again.');
    } finally { setSaving(false); }
  }

  async function performExport(action) {
    try {
      if (!action) throw new Error('Export unavailable');
      const exported = await action();
      if (exported === false || exported === null) throw new Error('Export unavailable');
      if (typeof exported === 'string' && exported.startsWith('data:image/png')) {
        const link = document.createElement('a');
        link.href = exported;
        link.download = 'Dream-Home-3D.png';
        link.click();
      }
      announce('Export ready');
    } catch { announce('Export is unavailable for this view.'); }
  }

  useEffect(() => {
    const onShortcut = (event) => {
      if (event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      if (event.ctrlKey || event.metaKey) {
        if (event.key.toLowerCase() === 's') { event.preventDefault(); save(); }
        if (event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
        if (event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); }
        return;
      }
      if (event.altKey || (activePane === '3d' && cameraView.preset === 'walkthrough')) return;
      const entry = TOOLS.find(([, , , key]) => key && key.toLowerCase() === event.key.toLowerCase());
      if (entry) selectTool(entry[0]);
      if (event.key === 'Escape') selectObject(null);
      if ((event.key === 'Delete' || event.key === 'Backspace') && view !== '3d' && selectedObject) {
        event.preventDefault(); planApi.current?.deleteSelected?.();
      }
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  });

  const exportOptions = [
    ...(view !== '3d' ? [
      { label: '2D floor plan PNG', icon: HiOutlinePhoto, action: () => performExport(planApi.current?.exportPNG) },
      { label: '2D floor plan PDF', icon: HiOutlineDocumentArrowDown, action: () => performExport(planApi.current?.exportPDF) },
    ] : []),
    ...(view !== '2d' ? [{ label: '3D viewport PNG', icon: HiOutlinePhoto, action: () => performExport(sceneApi.current?.exportPNG) }] : []),
    { label: 'Project JSON', icon: HiOutlineDocumentArrowDown, action: () => performExport(exportProject) },
  ];

  function zoom(direction) {
    const target = activePane === '3d' ? sceneApi : planApi;
    if (direction === 'in') target.current?.zoomIn?.();
    else target.current?.zoomOut?.();
  }

  function fit() {
    if (activePane === '2d') planApi.current?.resetView?.();
    else setCamera('orbit');
  }

  return <div className="planner-workspace" data-theme={theme}>
    <Toolbar view={view} changeView={changeView} theme={theme} toggleTheme={toggleTheme} save={save} status={status} saving={saving} options={exportOptions} />
    <div className="workspace-body">
      <ToolRail tool={tool} selectTool={selectTool} focus={focus} onDesign={focusDesign} view={view} />

      <main className={`workspace-stage workspace-stage--${view}`} aria-label="Design workspace">
        {view !== '3d' && <section className="workspace-viewport" aria-label="2D plan" onPointerDownCapture={() => setActivePane('2d')}>
          <div className="workspace-viewport-heading">
            <button type="button" aria-pressed={activePane === '2d'} onClick={() => setActivePane('2d')}><HiOutlineSquares2X2 size={17} />2D floor plan</button>
            <span>{currentFloorName}</span>
          </div>
          <div className="workspace-plan-pane">
            <FloorPlanGenerator embedded tool={tool} activeFloor={activeFloor} selectedObject={selectedObject} onSelectionChange={selectObject}
              onToolUsed={() => setTool('select')} apiRef={planApi} theme={theme} />
          </div>
        </section>}
        {view !== '2d' && <section className="workspace-viewport" aria-label="3D model" onPointerDownCapture={() => setActivePane('3d')}>
          <div className="workspace-viewport-heading">
            <button type="button" aria-pressed={activePane === '3d'} onClick={() => setActivePane('3d')}><HiOutlineCube size={17} />3D model</button>
            <div className="workspace-viewport-actions">
              {canShowSite && <button type="button" aria-pressed={onSite} onClick={() => { setSiteView(!onSite); setCamera('orbit'); }}><HiOutlineMap size={16} />On plot</button>}
              {!onSite && <button type="button" aria-pressed={cameraView.preset === 'walkthrough'} onClick={() => setCamera(cameraView.preset === 'walkthrough' ? 'orbit' : 'walkthrough')}>Walkthrough</button>}
            </div>
          </div>
          <Suspense fallback={<div className="workspace-scene-empty" role="status">Loading 3D model…</div>}>
            <Designer3D settings={settings} cameraView={cameraView} activeFloor={activeFloor} siteView={onSite} rotate={rotate} apiRef={sceneApi}
              selectedObject={selectedObject} onSelectionChange={selectObject} keyboardActive={activePane === '3d'} />
          </Suspense>
        </section>}
      </main>

      <PlannerProperties section={properties} setSection={setProperties} activeFloor={activeFloor} currentFloorName={currentFloorName} selectedObject={selectedObject}
        onSelectionChange={selectObject} settings={settings} updateSettings={updateSettings} showFullModel={showFullModel} theme={theme} />
    </div>

    <BottomBar layouts={layouts} activeFloor={activeFloor} selectFloor={selectFloor} addFloor={createFloor} cameraPreset={cameraView.preset} setCamera={setCamera}
      rotate={rotate} toggleRotate={() => { if (cameraView.preset !== 'orbit') setCamera('orbit'); setRotate(!rotate); }} zoom={zoom} fit={fit} activePane={activePane} siteView={onSite} />
  </div>;
}
