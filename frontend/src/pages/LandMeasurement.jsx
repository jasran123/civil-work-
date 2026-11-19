import { lazy, Suspense, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiCube, HiOutlineHome, HiOutlineMap, HiPlus, HiTrash } from 'react-icons/hi';
import PlotCanvas from '../components/PlotCanvas';
import { BoundaryInputs, MeasurementInputs, PlotNumber, PlotSelect, SurveyInputs } from '../components/PlotInputs';
import { useDesign } from '../context/DesignContext';
import { generateFloorPlans } from '../utils/floorPlanGenerator';
import { areaMeasurements, editPlotAngle, editPlotEdge, plotBoundaryEdges, polygonArea, polygonMetrics } from '../utils/plotGeometry';
import {
  checkSiteItem, edgeName, findSiteItem, fromFeet, getHouseTemplate, getPlotResult, getPlotSceneData,
  getProjectPlot, getRoadDirection, getRoadEdge, getSiteItems, SITE_FEATURES, validateSite,
} from '../utils/plotProject';
import './LandMeasurement.css';

const PlotScene = lazy(() => import('../three/PlotScene'));
const SOURCES = [['measurements', 'Measurements'], ['coordinates', 'Survey coordinates'], ['draw', 'Draw corners']];
const AREA_LABELS = [['squareFeet', 'Square feet', 'ft²'], ['squareMetres', 'Square metres', 'm²'], ['cents', 'Cents', ''], ['grounds', 'Grounds', '']];
const SIDES = ['front', 'back', 'left', 'right'];
const TWO_DECIMALS = { maximumFractionDigits: 2 };
const format = (value) => value.toLocaleString('en-IN', TWO_DECIMALS);
const normalizeAngle = (value) => ((value % 360) + 360) % 360;
const emptyCorner = () => ({ x: null, y: null });

export default function LandMeasurement() {
  const navigate = useNavigate();
  const { design, updateDesign } = useDesign();
  const plot = useMemo(() => getProjectPlot(design), [design.plot, design.landLength, design.landWidth, design.roadFacing]);
  const result = useMemo(() => getPlotResult(plot), [plot]);
  const points = result.status === 'valid' ? result.points : [];
  const metrics = points.length ? polygonMetrics(points) : null;
  const frontEdge = getRoadEdge(plot, points);
  const houseTemplate = useMemo(() => getHouseTemplate(design), [design.rooms, design.plans, design.currentPlanIndex, design.floors, design.floorLayouts, design.floorDetails]);
  const items = useMemo(() => getSiteItems(plot, houseTemplate), [plot, houseTemplate]);
  const scene = points.length ? getPlotSceneData(design, plot, result, items) : null;
  const siteFit = points.length ? validateSite(points, plot, houseTemplate) : null;
  const frontLength = metrics?.sides[frontEdge];
  const boundaryEdges = metrics ? plotBoundaryEdges(points, frontEdge) : [];
  const setbackSides = SIDES.filter((side) => boundaryEdges.some((edge) => edge.side === side));
  const gateTooWide = frontLength != null && plot.gate.enabled && plot.gate.width > frontLength;
  const [view, setView] = useState('2d');
  const [fitKey, setFitKey] = useState(0);
  const [activeItemId, setActiveItemId] = useState('house');
  const [interactionMessage, setInteractionMessage] = useState('');
  const [requirements, setRequirements] = useState(() => ({ floors: design.floors || 1, houseType: design.houseType || '2BHK', budget: design.budget || 2500000 }));
  const selected = items.find((item) => item.id === activeItemId);
  const validHouse = scene?.items.find((item) => item.kind === 'house');
  const openArea = metrics && Math.max(0, metrics.area - (validHouse ? polygonArea(validHouse.points) : 0));

  function savePlot(changes, synchronizeRoad = false) {
    const next = { ...plot, ...changes };
    const nextResult = getPlotResult(next);
    const valid = nextResult.status === 'valid';
    const activeEdge = valid ? getRoadEdge(next, nextResult.points) : next.frontEdge;
    updateDesign({
      plot: { ...next, frontEdge: activeEdge },
      landArea: valid ? polygonArea(nextResult.points) : null,
      ...(valid && (synchronizeRoad || !design.plot) ? { roadFacing: getRoadDirection(nextResult.points, activeEdge, next.northAngle) } : {}),
    });
  }

  function updatePlot(changes) {
    setInteractionMessage('');
    savePlot(changes, ['frontEdge', 'northAngle', 'points', 'shape', 'sides', 'source', 'angles', 'diagonal', 'diagonalLayout', 'notch'].some((key) => key in changes));
  }

  function changeShape(shape) {
    const sides = { ...plot.sides };
    if (shape === 'l-shape') {
      sides.back = null;
      sides.right = null;
    }
    updatePlot({ shape, sides, angles: {}, diagonal: {}, diagonalLayout: 'auto', notch: {}, frontEdge: 0 });
    setFitKey((value) => value + 1);
  }

  function changeSource(source) {
    if (source === plot.source) return;
    const editedPoints = points.length ? points : plot.points;
    const draft = source === 'coordinates'
      ? Array.from({ length: Math.max(3, editedPoints.length) }, (_, index) => editedPoints[index] || emptyCorner())
      : editedPoints.filter((point) => point.x != null && point.y != null);
    updatePlot({ source, points: source === 'measurements' ? plot.points : draft });
    setFitKey((value) => value + 1);
  }

  function editBoundary(nextPoints, nextFront = plot.frontEdge, allowIncomplete = false) {
    const source = plot.source === 'coordinates' ? 'coordinates' : 'draw';
    const candidate = { ...plot, source, points: nextPoints, frontEdge: nextFront };
    const validation = getPlotResult(candidate);
    if (validation.status === 'invalid' || (!allowIncomplete && validation.status !== 'valid')) {
      setInteractionMessage(validation.message || 'Enter at least three different corners.');
      return;
    }
    updatePlot({ source, points: nextPoints, frontEdge: nextFront });
  }

  function moveCorner(index, point) {
    const current = points.length ? points : plot.points;
    editBoundary(current.map((entry, i) => i === index ? point : entry), plot.frontEdge, current.length < 3);
  }

  function addCorner(edgeIndex, point) {
    const current = points.length ? points : plot.points;
    const position = edgeIndex < 0 ? current.length : edgeIndex + 1;
    const nextFront = position <= frontEdge ? frontEdge + 1 : frontEdge;
    editBoundary([...current.slice(0, position), point, ...current.slice(position)], nextFront, true);
  }

  function removeCorner(index, allowIncomplete = false) {
    const isSurveyEdit = plot.source === 'coordinates' && allowIncomplete;
    const current = isSurveyEdit ? plot.points : points.length ? points : plot.points;
    const nextFront = index < frontEdge ? frontEdge - 1 : index === frontEdge ? Math.max(0, frontEdge - 1) : frontEdge;
    const next = current.filter((_, i) => i !== index);
    if (isSurveyEdit) updatePlot({ points: next, frontEdge: nextFront });
    else editBoundary(next, nextFront, true);
  }

  function editMeasure(index, value, method) {
    const edited = method(points, index, value);
    if (edited.status === 'valid') editBoundary(edited.points);
    else setInteractionMessage(edited.message || 'Enter a valid measurement.');
  }

  function placeItem(item) {
    const placement = findSiteItem(points, item, plot, items);
    if (!placement) {
      setInteractionMessage(`Could not find space for ${item.label.toLowerCase()} with the current boundary and layout.`);
      return;
    }
    if (item.kind === 'house') {
      const { x, y, rotation } = placement;
      updatePlot({ house: { x, y, rotation } });
    } else {
      const { id, kind, label, x, y, width, depth, rotation, height } = placement;
      const feature = { id, kind, label, x, y, width, depth, rotation, height };
      const features = plot.features.some((entry) => entry.id === item.id)
        ? plot.features.map((entry) => entry.id === item.id ? feature : entry)
        : [...plot.features, feature];
      updatePlot({ features });
    }
    setView('2d');
    setActiveItemId(item.id);
  }

  function updateItem(id, changes) {
    const current = items.find((item) => item.id === id);
    if (!current || !points.length) return;
    const candidate = { ...current, ...changes };
    const fit = checkSiteItem(points, candidate, plot, items);
    if (!fit.valid) {
      setInteractionMessage(fit.message);
      return;
    }
    if (candidate.kind === 'house') {
      const { x, y, rotation } = candidate;
      updatePlot({ house: { x, y, rotation } });
    } else {
      updatePlot({ features: plot.features.map((feature) => feature.id === id ? { ...feature, ...changes } : feature) });
    }
  }

  function removeItem(item) {
    updatePlot(item.kind === 'house' ? { house: null } : { features: plot.features.filter(({ id }) => id !== item.id) });
    setActiveItemId(null);
  }

  function openFloorPlan() {
    if (houseTemplate) {
      navigate('/floor-plans');
      return;
    }
    const roadFacing = getRoadDirection(points, frontEdge, plot.northAngle);
    const dimensions = {
      landLength: Math.max(18, Math.floor(metrics.bounds.width - 0.5)),
      landWidth: Math.max(18, Math.floor(metrics.bounds.height - 0.5)),
      roadFacing,
    };
    const plans = generateFloorPlans({ ...dimensions, ...requirements });
    const fittingPlan = plans.findIndex((plan) => {
      const template = getHouseTemplate({ rooms: plan.rooms });
      return template && findSiteItem(points, { ...template, id: 'house', kind: 'house', label: 'House' }, plot, items);
    });
    const currentPlanIndex = Math.max(0, fittingPlan);
    updateDesign({ ...dimensions, ...requirements, plot, landArea: metrics.area, plans, currentPlanIndex, rooms: plans[currentPlanIndex]?.rooms || [] });
    navigate('/floor-plans');
  }

  const canvasPoints = points.length ? points : plot.source === 'draw' && plot.points.length < 3 ? plot.points : [];
  const edgeLabels = points.map((_, index) => {
    const side = boundaryEdges.find((edge) => edge.index === index)?.side;
    if (points.length <= 4 && side) return `${side[0].toUpperCase()}${side.slice(1)}`;
    return index === frontEdge ? 'Front' : edgeName(index, points.length);
  });

  return (
    <div className="plot-page">
      <div className="plot-workspace">
        <header className="plot-header">
          <div>
            <h1>Land &amp; Plot Designer</h1>
            <p>Measure your boundary, plan your site and view it in 3D.</p>
          </div>
          <div className="plot-header-actions">
            <PlotSelect label="Measurement unit" value={plot.unit} onChange={(unit) => updatePlot({ unit })}>
              <option value="ft">Feet</option><option value="m">Metres</option>
            </PlotSelect>
            {houseTemplate && <Link to="/floor-plans" className="plot-button"><HiOutlineHome size={17} /> House floor plan</Link>}
          </div>
        </header>

        <div className="plot-layout">
          <section className="plot-card plot-boundary-controls" aria-labelledby="plot-boundary-title">
            <h2 id="plot-boundary-title">Boundary measurements</h2>
            <div className="plot-segment" role="group" aria-label="Geometry input method">
              {SOURCES.map(([source, label]) => <button key={source} type="button" aria-pressed={source === plot.source} onClick={() => changeSource(source)}>{label}</button>)}
            </div>
            {plot.source === 'measurements' && <MeasurementInputs plot={plot} onChange={updatePlot} onShapeChange={changeShape} />}
            {plot.source === 'coordinates' && (
              <SurveyInputs
                points={plot.points} unit={plot.unit}
                onChange={(index, point) => updatePlot({ points: plot.points.map((entry, i) => i === index ? point : entry) })}
                onRemove={(index) => removeCorner(index, true)}
                onAdd={() => updatePlot({ points: [...plot.points, emptyCorner()] })}
              />
            )}
            {plot.source === 'draw' && (
              <div className="plot-form-flow">
                <p className="plot-note">Choose Add corner in the 2D drawing. Start with at least three corners, then drag them to their measured positions or enter lengths and angles below.</p>
                <button type="button" className="plot-button" disabled={!plot.points.length} onClick={() => { setView('2d'); updatePlot({ points: [], frontEdge: 0 }); setFitKey((value) => value + 1); }}><HiTrash size={16} /> Clear boundary</button>
              </div>
            )}
            {metrics && <BoundaryInputs metrics={metrics} unit={plot.unit} onEdgeChange={(index, value) => editMeasure(index, value, editPlotEdge)} onAngleChange={(index, value) => editMeasure(index, value, editPlotAngle)} />}
            <div className={`plot-status plot-status--${result.status}`} role="status">
              <strong>{result.status === 'valid' ? 'Valid boundary' : result.status === 'insufficient' ? 'Additional measurements required' : 'Invalid boundary measurements'}</strong>
              {result.status !== 'valid' && result.message && result.message !== 'Additional measurements required' && <span>{result.message}</span>}
            </div>
          </section>

          <section className="plot-card plot-preview" aria-labelledby="plot-preview-title">
            <div className="plot-preview-heading">
              <h2 id="plot-preview-title">Plot preview</h2>
              <div className="plot-segment" role="group" aria-label="Plot view">
                <button type="button" aria-pressed={view === '2d'} onClick={() => setView('2d')}><HiOutlineMap size={17} /> 2D plan</button>
                <button type="button" aria-pressed={view === '3d'} onClick={() => setView('3d')}><HiCube size={17} /> 3D view</button>
              </div>
            </div>
            <div className="plot-viewport">
              {view === '2d' ? (
                <PlotCanvas
                  points={canvasPoints} unit={plot.unit} frontEdge={frontEdge} edgeLabels={edgeLabels}
                  items={scene?.items || []} activeItemId={activeItemId} onSelectItem={setActiveItemId}
                  onMovePoint={moveCorner} onAddPoint={addCorner} onRemovePoint={removeCorner}
                  onMoveItem={(id, position) => updateItem(id, position)}
                  northAngle={plot.northAngle} fitKey={fitKey} allowDraft={plot.source === 'draw'}
                  wallEnabled={plot.wallEnabled} gate={scene?.gate}
                  emptyMessage={plot.source === 'draw' ? 'Add corners to begin drawing your plot.' : 'Enter enough measurements to draw your plot.'}
                />
              ) : scene ? (
                <Suspense fallback={<div className="plot-preview-empty">Loading 3D plot…</div>}><PlotScene {...scene} /></Suspense>
              ) : <div className="plot-preview-empty">The 3D view needs a valid boundary.</div>}
            </div>
            <div className="plot-preview-summary" aria-live="polite">
              {metrics ? <span>{points.length} corners <span aria-hidden="true">·</span> {format(fromFeet(metrics.perimeter, plot.unit))} {plot.unit} perimeter</span> : <span>Additional measurements required</span>}
              {metrics && <span>Road edge {edgeName(frontEdge, points.length)}</span>}
            </div>
            {interactionMessage && <p className="plot-interaction-message" role="status">{interactionMessage}</p>}
          </section>

          <section className="plot-card plot-area" aria-labelledby="plot-area-title">
            <h2 id="plot-area-title">Land area</h2>
            {metrics ? (
              <>
                <dl className="plot-area-grid">
                  {AREA_LABELS.map(([key, label, unit]) => <div key={key}><dt>{label}</dt><dd>{format(areaMeasurements(metrics.area)[key])}{unit && <small>{unit}</small>}</dd></div>)}
                </dl>
                <p className="plot-open-area">Remaining open land <strong>{format(plot.unit === 'm' ? areaMeasurements(openArea).squareMetres : openArea)} {plot.unit === 'm' ? 'm²' : 'ft²'}</strong></p>
              </>
            ) : <p className="plot-note">Additional measurements required</p>}
          </section>

          <section className="plot-card plot-site-controls" aria-labelledby="plot-site-title">
            <h2 id="plot-site-title">Site layout</h2>
            {!metrics ? <p className="plot-note">Complete the boundary to set the road, entrance and house position.</p> : (
              <div className="plot-site-grid">
                <div className="plot-form-flow">
                  <h3>Road &amp; boundary</h3>
                  <div className="plot-field-grid">
                    <PlotSelect label="Road-facing side" value={frontEdge} onChange={(value) => updatePlot({ frontEdge: Number(value) })}>
                      {points.map((_, index) => <option key={index} value={index}>{edgeName(index, points.length)}</option>)}
                    </PlotSelect>
                    <PlotNumber label="North bearing (°)" value={plot.northAngle} onCommit={(value) => value != null && updatePlot({ northAngle: normalizeAngle(value) })} />
                  </div>
                  <label className="plot-checkbox"><input type="checkbox" checked={plot.wallEnabled} onChange={(event) => updatePlot({ wallEnabled: event.target.checked })} /> Perimeter compound wall</label>
                  {plot.wallEnabled && <PlotNumber label="Wall height" unit={plot.unit} min="0" value={plot.wallHeight} onCommit={(value) => value > 0 && updatePlot({ wallHeight: value })} />}
                  <label className="plot-checkbox"><input type="checkbox" checked={plot.gate.enabled} onChange={(event) => updatePlot({ gate: { ...plot.gate, enabled: event.target.checked } })} /> Entrance gate</label>
                  {plot.gate.enabled && (
                    <div className="plot-field-grid">
                      <PlotNumber label="Gate width" unit={plot.unit} min="0" value={plot.gate.width} onCommit={(value) => value > 0 && updatePlot({ gate: { ...plot.gate, width: value } })} />
                      <PlotNumber label="Gate position (%)" value={plot.gate.offset * 100} min="0" max="100" onCommit={(value) => value != null && updatePlot({ gate: { ...plot.gate, offset: Math.max(0, Math.min(1, value / 100)) } })} />
                    </div>
                  )}
                  {gateTooWide && <p className="plot-note plot-error">Gate width exceeds the road edge. Reduce the width to show the gate.</p>}
                </div>

                <div className="plot-form-flow">
                  <h3>House &amp; improvements</h3>
                  <div className="plot-field-grid">
                    {setbackSides.map((side) => <PlotNumber key={side} label={`${side[0].toUpperCase()}${side.slice(1)} setback`} unit={plot.unit} min="0" value={plot.setbacks[side]} onCommit={(value) => value != null && value >= 0 && updatePlot({ setbacks: { ...plot.setbacks, [side]: value } })} />)}
                  </div>
                  <div className="plot-add-actions">
                    {houseTemplate && <button className="plot-button plot-button--accent" type="button" onClick={() => placeItem({ ...houseTemplate, id: 'house', kind: 'house', label: 'House' })}><HiOutlineHome size={17} /> {plot.house ? 'Find house position' : 'Place house'}</button>}
                    {Object.entries(SITE_FEATURES).map(([kind, feature]) => (
                      <button className="plot-button" key={kind} type="button" onClick={() => placeItem({ ...feature, id: `${kind}-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`, kind })}><HiPlus size={16} /> {feature.label}</button>
                    ))}
                  </div>
                  {siteFit && !siteFit.valid && <p className="plot-note plot-error" role="status">{siteFit.item.label} needs a new position. {siteFit.message}</p>}
                  {items.length > 0 && (
                    <PlotSelect label="Edit site item" value={selected?.id || ''} onChange={setActiveItemId}>
                      <option value="">Select an item</option>
                      {items.map((item, index) => <option key={item.id} value={item.id}>{item.label}{item.kind !== 'house' && ` ${items.slice(0, index + 1).filter(({ kind }) => kind === item.kind).length}`}</option>)}
                    </PlotSelect>
                  )}
                  {selected && (
                    <>
                      <div className="plot-field-grid" key={selected.id}>
                        <PlotNumber label="Easting" unit={plot.unit} value={selected.x} onCommit={(value) => updateItem(selected.id, { x: value })} />
                        <PlotNumber label="Northing" unit={plot.unit} value={-selected.y} onCommit={(value) => value != null && updateItem(selected.id, { y: -value })} />
                        <PlotNumber label="Rotation (°)" value={selected.rotation} onCommit={(value) => value != null && updateItem(selected.id, { rotation: normalizeAngle(value) })} />
                        {selected.kind !== 'house' && (
                          <>
                            <PlotNumber label="Width" unit={plot.unit} min="0" value={selected.width} onCommit={(value) => updateItem(selected.id, { width: value })} />
                            <PlotNumber label={selected.kind === 'wall' ? 'Thickness' : 'Depth'} unit={plot.unit} min="0" value={selected.depth} onCommit={(value) => updateItem(selected.id, { depth: value })} />
                          </>
                        )}
                        {selected.kind === 'wall' && <PlotNumber label="Height" unit={plot.unit} min="0" value={selected.height ?? plot.wallHeight} onCommit={(value) => value > 0 && updateItem(selected.id, { height: value })} />}
                      </div>
                      <div className="plot-add-actions">
                        {selected.kind !== 'house' && <button className="plot-button" type="button" onClick={() => placeItem(selected)}>Find position</button>}
                        <button className="plot-button" type="button" onClick={() => removeItem(selected)}><HiTrash size={16} /> Remove {selected.label.toLowerCase()}</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="plot-card plot-house" aria-labelledby="plot-house-title">
          <div>
            <h2 id="plot-house-title">House design</h2>
            <p className="plot-note">{houseTemplate ? `Current footprint ${format(fromFeet(houseTemplate.width, plot.unit))} × ${format(fromFeet(houseTemplate.depth, plot.unit))} ${plot.unit}.` : 'Generate a house floor plan to place it on your plot.'}</p>
          </div>
          {!houseTemplate && (
            <div className="plot-house-fields">
              <PlotSelect label="Configuration" value={requirements.houseType} onChange={(houseType) => setRequirements({ ...requirements, houseType })}>
                {['1BHK', '2BHK', '3BHK', '4BHK'].map((type) => <option key={type} value={type}>{type}</option>)}
              </PlotSelect>
              <PlotSelect label="Floors" value={requirements.floors} onChange={(floors) => setRequirements({ ...requirements, floors: Number(floors) })}>
                <option value="1">Ground</option><option value="2">Ground + 1</option><option value="3">Ground + 2</option>
              </PlotSelect>
              <PlotNumber label="Budget (INR)" value={requirements.budget} min="1" onCommit={(value) => value > 0 && setRequirements({ ...requirements, budget: value })} />
            </div>
          )}
          <div className="plot-add-actions">
            <button className="plot-button plot-button--accent" type="button" disabled={!houseTemplate && !metrics} onClick={openFloorPlan}>{houseTemplate ? 'Open floor plan' : 'Generate floor plans'}</button>
            {(metrics || houseTemplate) && <Link className="plot-button" to="/cost-calculator" onClick={() => { if (!design.plot && metrics) savePlot({}); }}>Estimate &amp; save</Link>}
          </div>
        </section>
      </div>
    </div>
  );
}
