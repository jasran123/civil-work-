// Civil Engineering BOQ & Construction Cost Estimator — Indian Construction Standards (IS Codes / CPWD)
// Disclaimer: Preliminary conceptual calculation for budgetary planning. Structural engineering calculations, soil bearing tests, and local contractor quotes are required prior to execution.

export const DEFAULT_RATES = {
  // Unit material rates in INR (₹)
  cementPricePerBag: 395,       // ₹ per 50kg bag (PPC / OPC 53 Grade)
  steelPricePerKg: 68,          // ₹ per kg (Fe550D TMT Rebar)
  brickPricePerUnit: 8.5,       // ₹ per standard red clay / fly ash brick
  sandPricePerCft: 55,          // ₹ per cu.ft (Coarse M-Sand / River Sand)
  aggregatePricePerCft: 42,     // ₹ per cu.ft (20mm & 10mm crushed stone)
  concretePerCum: 4800,         // ₹ per cu.m (M20/M25 Ready Mix Concrete)
  flooringPerSqFt: 85,          // ₹ per sq.ft (Double-charge vitrified tiles 2x2 / 4x2)
  doorPerUnit: 7500,            // ₹ per flush door with frame & hardware
  mainDoorCost: 32000,          // ₹ for solid teak wood main entrance door
  windowPerUnit: 6200,          // ₹ per UPVC/Powder-coated aluminum sliding window with glass
  paintingPerSqFt: 32,          // ₹ per sq.ft (2 coats putty, 1 coat primer, 2 coats luxury emulsion)

  // Labor & Trades rates
  laborPerSqFt: 380,            // ₹ per sq.ft (Masonry, shuttering, bar-bending, RCC labor)
  electricalPercentage: 7,      // % of basic structural cost (Concealed conduiting, FRLS wiring, DB, switches)
  plumbingPercentage: 6,        // % of basic structural cost (CPVC/SWR piping, sanitaryware, fittings)
  contingencyPercentage: 5,     // % emergency escalation buffer
};

export function calculateCost({
  landLength = 40,
  landWidth = 30,
  plotArea = landLength * landWidth,
  floors = 1,
  houseType = '2BHK',
  rooms = [],
  floorLayouts,
  rates = {},
}) {
  const r = { ...DEFAULT_RATES, ...rates };

  // Calculate actual built-up area from rooms if available, else derive from plot coverage
  let groundCarpetArea = 0;
  let totalCarpetArea = 0;
  let totalDoorsCount = 0;
  let totalWindowsCount = 0;

  const layouts = floorLayouts?.some((floor) => floor.length) ? floorLayouts : null;
  let floorAreas = [];
  if (layouts || rooms?.length) {
    floorAreas = (layouts || [rooms]).map((floor) => floor.reduce((area, room) => {
      totalDoorsCount += (room.doors || []).length;
      totalWindowsCount += (room.windows || []).length;
      return area + room.width * room.height;
    }, 0));
    groundCarpetArea = floorAreas[0];
    totalCarpetArea = layouts ? floorAreas.reduce((sum, area) => sum + area, 0) : groundCarpetArea * floors;
  } else {
    const coverageRatio =
      houseType === '1BHK' ? 0.55 : houseType === '2BHK' ? 0.62 : houseType === '3BHK' ? 0.68 : 0.72;
    groundCarpetArea = Math.round((plotArea ?? 0) * coverageRatio * 0.86);
    totalCarpetArea = groundCarpetArea * floors;
  }

  // 14% allowance for outer and partition walls to derive Built-Up Area per floor
  const builtUpPerFloor = Math.round(groundCarpetArea * 1.14);
  const modeledBuiltUpArea = layouts
    ? floorAreas.reduce((sum, area) => sum + Math.round(area * 1.14), 0)
    : builtUpPerFloor * floors;
  const totalBuiltUpArea = Math.max(300, modeledBuiltUpArea);

  // Default door/window counts if not populated
  if (totalDoorsCount === 0) totalDoorsCount = Math.max(4, Math.round(totalBuiltUpArea / 140));
  if (totalWindowsCount === 0) totalWindowsCount = Math.max(4, Math.round(totalBuiltUpArea / 120));

  // --- MATERIAL QUANTITIES ACCORDING TO IS/CPWD EMPIRICAL INDICES ---

  // 1. Concrete (M20/M25): Approx 0.065 cu.m per sq.ft of built-up area (Footings, Columns, Plinth & Roof Slabs)
  const concreteCum = Math.round(totalBuiltUpArea * 0.068);
  const concreteCft = Math.round(concreteCum * 35.3147);
  const concreteCost = Math.round(concreteCum * r.concretePerCum);

  // 2. Cement: Approx 0.42 bags per sq.ft of total built-up area (RCC + Brickwork + Plastering)
  const cementBags = Math.round(totalBuiltUpArea * 0.43);
  const cementCost = Math.round(cementBags * r.cementPricePerBag);

  // 3. Steel (TMT Fe550D): Approx 3.85 kg per sq.ft of built-up area
  const steelKg = Math.round(totalBuiltUpArea * 3.85);
  const steelTonnes = (steelKg / 1000).toFixed(2);
  const steelCost = Math.round(steelKg * r.steelPricePerKg);

  // 4. Bricks: Approx 8.5 bricks per sq.ft of built-up area (9" outer walls + 4.5" partitions)
  const bricksCount = Math.round(totalBuiltUpArea * 8.5);
  const brickCost = Math.round(bricksCount * r.brickPricePerUnit);

  // 5. Sand / M-Sand: Approx 1.35 cu.ft per sq.ft (Masonry + Plastering + Concrete bedding)
  const sandCft = Math.round(totalBuiltUpArea * 1.35);
  const sandBrass = (sandCft / 100).toFixed(1);
  const sandCost = Math.round(sandCft * r.sandPricePerCft);

  // 6. Aggregate (20mm & 10mm): Approx 0.85 cu.ft per sq.ft
  const aggregateCft = Math.round(totalBuiltUpArea * 0.85);
  const aggregateBrass = (aggregateCft / 100).toFixed(1);
  const aggregateCost = Math.round(aggregateCft * r.aggregatePricePerCft);

  // 7. Flooring & Tiles: Approx 1.15 × carpet area (Flooring + 4" skirting + wastage)
  const flooringSqFt = Math.round(totalCarpetArea * 1.15);
  const flooringCost = Math.round(flooringSqFt * r.flooringPerSqFt);

  // 8. Doors & Windows
  const mainDoorTotal = r.mainDoorCost;
  const internalDoorsTotal = Math.max(0, (totalDoorsCount - 1)) * r.doorPerUnit;
  const doorsTotalCost = mainDoorTotal + internalDoorsTotal;
  const windowsTotalCost = totalWindowsCount * r.windowPerUnit;

  // 9. Surface Painting & Putty: Wall surface area ~ 2.8 × floor area
  const paintingSqFt = Math.round(totalBuiltUpArea * 2.8);
  const paintingCost = Math.round(paintingSqFt * r.paintingPerSqFt);

  // 10. Labor & Workmanship
  const laborCost = Math.round(totalBuiltUpArea * r.laborPerSqFt);

  // 11. Mechanical, Electrical & Plumbing (MEP)
  const rawStructuralBase = cementCost + steelCost + brickCost + sandCost + aggregateCost + concreteCost + laborCost;
  const electricalCost = Math.round(rawStructuralBase * (r.electricalPercentage / 100));
  const plumbingCost = Math.round(rawStructuralBase * (r.plumbingPercentage / 100));

  // Subtotals
  const totalMaterialsCost =
    cementCost + steelCost + brickCost + sandCost + aggregateCost + concreteCost + flooringCost + doorsTotalCost + windowsTotalCost + paintingCost;
  const subtotal = totalMaterialsCost + laborCost + electricalCost + plumbingCost;

  // Contingency Buffer
  const contingency = Math.round(subtotal * (r.contingencyPercentage / 100));
  const grandTotal = subtotal + contingency;
  const costPerSqFt = Math.round(grandTotal / totalBuiltUpArea);

  return {
    plotArea,
    groundCarpetArea,
    totalCarpetArea,
    builtUpPerFloor,
    totalBuiltUpArea,
    costPerSqFt,
    quantities: {
      concrete: { quantity: concreteCum, unit: 'cu.m', cft: concreteCft, cost: concreteCost, spec: 'M20 / M25 RCC Slabs, Footings & Columns' },
      cement: { quantity: cementBags, unit: 'bags (50kg)', cost: cementCost, spec: 'PPC / OPC 53 Grade (RCC, Masonry & Plaster)' },
      steel: { quantity: steelKg, unit: 'kg', tonnes: steelTonnes, cost: steelCost, spec: 'TMT Fe550D corrosion-resistant rebars' },
      bricks: { quantity: bricksCount, unit: 'nos', cost: brickCost, spec: 'High-strength Red Clay / Fly Ash bricks' },
      sand: { quantity: sandCft, unit: 'cu.ft', brass: sandBrass, cost: sandCost, spec: 'Coarse Zone-II M-Sand / River Sand' },
      aggregate: { quantity: aggregateCft, unit: 'cu.ft', brass: aggregateBrass, cost: aggregateCost, spec: '20mm & 10mm crushed blue metal granite' },
      flooring: { quantity: flooringSqFt, unit: 'sq.ft', cost: flooringCost, spec: 'Double-charged glazed vitrified tiles & skirting' },
      doors: { quantity: totalDoorsCount, unit: 'units', cost: doorsTotalCost, spec: '1 Teak Main Door + Flush Internal Doors with Mortise Locks' },
      windows: { quantity: totalWindowsCount, unit: 'units', cost: windowsTotalCost, spec: 'UPVC / Powder-coated 3-track sliding windows with 5mm glass' },
      painting: { quantity: paintingSqFt, unit: 'sq.ft', cost: paintingCost, spec: '2 coats acrylic putty + 1 primer + 2 coats luxury emulsion' },
    },
    laborCost,
    electricalCost,
    plumbingCost,
    totalMaterialsCost,
    subtotal,
    contingency,
    grandTotal,
    disclaimer: 'Preliminary civil engineering cost estimate for budgetary planning purposes. Actual costs are subject to structural design, soil bearing test, local municipality bylaws, material brand selection, and contractor quotations.',
  };
}

export function formatINR(val) {
  if (val == null || isNaN(val)) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val).toLocaleString('en-IN')}`;
}
