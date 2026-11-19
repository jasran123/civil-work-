import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDesign } from '../context/DesignContext';
import { calculateCost, formatINR, DEFAULT_RATES } from '../utils/costCalculator';
import { describeDesignPlot, getDesignPlotArea } from '../utils/plotProject';
import { getFloorLayouts } from '../utils/projectState';
import {
  HiDownload,
  HiOutlineAdjustments,
  HiCube,
  HiArrowLeft,
  HiCheckCircle,
  HiShieldExclamation,
  HiDocumentText,
} from 'react-icons/hi';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function CostCalculator() {
  const navigate = useNavigate();
  const { design, saveProject } = useDesign();

  const [rates, setRates] = useState(DEFAULT_RATES);
  const [showRateEditor, setShowRateEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const floorLayouts = getFloorLayouts(design);
  const plotArea = getDesignPlotArea(design);
  const plotDescription = describeDesignPlot(design, plotArea);

  const costData = useMemo(() => {
    return calculateCost({
      landLength: design.landLength || 40,
      landWidth: design.landWidth || 30,
      plotArea,
      floors: design.floors || 1,
      houseType: design.houseType || '2BHK',
      floorLayouts,
      rates,
    });
  }, [design.landLength, design.landWidth, plotArea, design.floors, design.houseType, floorLayouts, rates]);

  const handleRateChange = (key, val) => {
    setRates((prev) => ({ ...prev, [key]: Number(val) }));
  };

  const handleResetRates = () => {
    setRates(DEFAULT_RATES);
  };

  // Export BOQ to CSV
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'DREAM HOME 3D — BILL OF QUANTITIES (BOQ)\n';
    csvContent += `Plot,"${plotDescription}"\n`;
    csvContent += `Total Built-up Area,${costData.totalBuiltUpArea} sq.ft (${design.floors} Floor(s))\n`;
    csvContent += `Configuration,${design.houseType}\n`;
    csvContent += `Estimated Cost Per Sq.Ft,₹${costData.costPerSqFt}\n\n`;

    csvContent += 'Item / Material,Estimated Quantity,Unit,Specification,Cost (INR)\n';
    Object.entries(costData.quantities).forEach(([k, v]) => {
      csvContent += `"${k.toUpperCase()}","${v.quantity}","${v.unit}","${v.spec}","${v.cost}"\n`;
    });

    csvContent += `\n"Labor & Workmanship Charges","${costData.totalBuiltUpArea}","sq.ft","Site execution and supervision","${costData.laborCost}"\n`;
    csvContent += `"Electrical & Conduiting","${costData.totalBuiltUpArea}","sq.ft","7% allowance","${costData.electricalCost}"\n`;
    csvContent += `"Plumbing & Sanitary Lines","${costData.totalBuiltUpArea}","sq.ft","6% allowance","${costData.plumbingCost}"\n`;
    csvContent += `"Contingency Buffer (5%)","1","lump sum","Price escalation buffer","${costData.contingency}"\n`;
    csvContent += `"GRAND TOTAL ESTIMATED BUDGET","","","All Inclusive","${costData.grandTotal}"\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DreamHome_BOQ_${design.houseType}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Professional Civil Engineering PDF
  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Header Bar
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 32, 'F');
    doc.setTextColor(212, 175, 55);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('DREAM HOME 3D — CIVIL BOQ ESTIMATE', 14, 16);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Preliminary Material Quantities & Structural Cost Schedule (Indian Rates)', 14, 25);

    // Project Metadata
    doc.setTextColor(30, 30, 36);
    doc.setFontSize(10);
    doc.text(`Plot: ${plotDescription} | Road: ${design.roadFacing} Facing`, 14, 42);
    doc.text(`Built-up Area: ${costData.totalBuiltUpArea} sq.ft (${design.floors} Floor(s)) | Configuration: ${design.houseType}`, 14, 48);
    doc.text(`Estimated Construction Rate: ₹${costData.costPerSqFt.toLocaleString('en-IN')}/sq.ft | Grand Budget: ${formatINR(costData.grandTotal)}`, 14, 54);

    // Material Takeoff Table
    const materialRows = Object.entries(costData.quantities).map(([k, v]) => [
      k.toUpperCase(),
      `${v.quantity.toLocaleString()} ${v.unit}`,
      v.spec,
      formatINR(v.cost),
    ]);

    doc.autoTable({
      startY: 60,
      head: [['Material / Trade', 'Estimated Quantity', 'IS / CPWD Specification', 'Subtotal (INR)']],
      body: materialRows,
      theme: 'striped',
      headStyles: { fillColor: [212, 175, 55], textColor: [15, 23, 42], fontStyle: 'bold' },
      styles: { fontSize: 8 },
    });

    // Summary Schedule Table
    const summaryRows = [
      ['Total Building Materials Takeoff', 'Concrete, steel, cement, bricks, sand, tiles, doors, paint', formatINR(costData.totalMaterialsCost)],
      ['Site Labor, Masonry & RCC Carpentry', `@ ₹${rates.laborPerSqFt}/sq.ft of built-up`, formatINR(costData.laborCost)],
      ['Concealed Electrical & Conduiting', `${rates.electricalPercentage}% allowance`, formatINR(costData.electricalCost)],
      ['Sanitary, Water Supply & Drainage', `${rates.plumbingPercentage}% allowance`, formatINR(costData.plumbingCost)],
      [`Contingency Buffer (${rates.contingencyPercentage}%)`, 'Escalation, wastage & unforeseen expenses', formatINR(costData.contingency)],
      ['GRAND TOTAL ESTIMATED COST', 'All inclusive preliminary budget', formatINR(costData.grandTotal)],
    ];

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Category', 'Description / Basis', 'Estimated Amount (INR)']],
      body: summaryRows,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
      styles: { fontSize: 8.5 },
    });

    // Statutory Disclaimer
    const lastY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(7.5);
    doc.setTextColor(150, 100, 20);
    doc.text('STATUTORY NOTICE: This Bill of Quantities (BOQ) is a preliminary conceptual calculation for budgetary guidance.', 14, lastY);
    doc.text('Actual structural rebar schedules, concrete mixes, soil bearing capacity, and local contractor quotations must be certified', 14, lastY + 4);
    doc.text('by a licensed civil engineer and approved by the local municipal corporation prior to construction.', 14, lastY + 8);

    doc.save(`BOQ_Estimate_${design.houseType}_${Date.now()}.pdf`);
  };

  const handleSaveDesign = async () => {
    setSaving(true);
    setSaveMessage('');
    try {
      const result = await saveProject({
        builtUpArea: costData.totalBuiltUpArea,
        costPerSqFt: costData.costPerSqFt,
        structuralCost: costData.totalMaterialsCost,
        finishingCost: costData.laborCost + costData.electricalCost + costData.plumbingCost,
        totalCost: costData.grandTotal,
      });
      setSaveMessage(result.scope === 'account' ? 'Project successfully saved to your dashboard.' : 'Project successfully saved in this browser.');
    } catch {
      setSaveMessage('Could not save the project.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-16 bg-cream text-charcoal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pt-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gold bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20">
                Phase 4: Civil Engineering BOQ
              </span>
              <span className="text-[11px] text-gray-500 font-medium">IS Code & CPWD Indexed</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-charcoal mt-1">
              Construction Cost Estimation & BOQ
            </h1>
            <p className="text-xs text-gray-500">
              Plot: {plotDescription} • Built-up Area: {costData.totalBuiltUpArea} sq.ft • {design.houseType}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => navigate('/3d-designer')}
              className="btn-secondary py-2 px-3.5 text-xs gap-1.5"
            >
              <HiCube size={16} /> Back to 3D Model
            </button>
            <button
              onClick={() => setShowRateEditor(!showRateEditor)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                showRateEditor ? 'bg-gold text-charcoal border-gold font-bold' : 'bg-white border-gray-200 text-charcoal hover:bg-gray-50'
              }`}
            >
              <HiOutlineAdjustments size={16} />
              {showRateEditor ? 'Hide Rates Editor' : 'Customize Material Rates'}
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-charcoal"
            >
              <HiDownload size={15} /> CSV
            </button>
            <button
              onClick={handleDownloadPDF}
              className="btn-primary py-2 px-4 text-xs gap-1.5 shadow-md"
            >
              <HiDocumentText size={16} /> Export BOQ (PDF)
            </button>
          </div>
        </div>

        {/* Statutory Preliminary Notice Card */}
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 mb-6 text-xs flex items-start gap-3 shadow-sm">
          <HiShieldExclamation className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <strong className="font-bold">Preliminary Estimation Disclaimer:</strong> {costData.disclaimer}
          </div>
        </div>

        {/* Key Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase text-gray-500">Estimated Total Cost</span>
            <div className="mt-2">
              <span className="text-2xl lg:text-3xl font-heading font-bold text-gold-dark">
                {formatINR(costData.grandTotal)}
              </span>
              <p className="text-[11px] text-gray-500 mt-1">₹{costData.grandTotal.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase text-gray-500">Cost Per Sq.Ft</span>
            <div className="mt-2">
              <span className="text-2xl font-heading font-bold text-charcoal">
                ₹{costData.costPerSqFt.toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-gray-500"> / sq.ft</span>
              <p className="text-[11px] text-gray-400 mt-1">Standard residential Grade-A finish</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase text-gray-500">Total Built-Up Area</span>
            <div className="mt-2">
              <span className="text-2xl font-heading font-bold text-charcoal">
                {costData.totalBuiltUpArea}
              </span>
              <span className="text-xs text-gray-500"> sq.ft</span>
              <p className="text-[11px] text-gray-400 mt-1">
                {design.floors} Floor(s) • Carpet: {costData.totalCarpetArea} sq.ft
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase text-gray-500">Total Steel & Cement</span>
            <div className="mt-2">
              <span className="text-xl font-heading font-bold text-charcoal">
                {costData.quantities.steel.tonnes} MT • {costData.quantities.cement.quantity} Bags
              </span>
              <p className="text-[11px] text-gray-400 mt-1">Fe550D TMT + PPC 53 Grade</p>
            </div>
          </div>
        </div>

        {/* Editable Rate Customizer Drawer */}
        {showRateEditor && (
          <div className="bg-white rounded-3xl shadow-md border border-gold/30 p-6 mb-6 transition-all">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
              <div>
                <h3 className="font-heading font-bold text-base text-charcoal">
                  Customize Material & Labor Rates (INR)
                </h3>
                <p className="text-xs text-gray-500">
                  Update rates per your local regional market to recalculate instant BOQ totals.
                </p>
              </div>
              <button
                onClick={handleResetRates}
                className="text-xs font-semibold text-gold-dark hover:underline"
              >
                Reset to Standard Rates
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-gray-600 block">Cement (₹/bag)</label>
                <input
                  type="number"
                  value={rates.cementPricePerBag}
                  onChange={(e) => handleRateChange('cementPricePerBag', e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-xl border border-gray-200 focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-600 block">Steel TMT (₹/kg)</label>
                <input
                  type="number"
                  value={rates.steelPricePerKg}
                  onChange={(e) => handleRateChange('steelPricePerKg', e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-xl border border-gray-200 focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-600 block">Bricks (₹/unit)</label>
                <input
                  type="number"
                  step="0.5"
                  value={rates.brickPricePerUnit}
                  onChange={(e) => handleRateChange('brickPricePerUnit', e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-xl border border-gray-200 focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-600 block">M-Sand (₹/cu.ft)</label>
                <input
                  type="number"
                  value={rates.sandPricePerCft}
                  onChange={(e) => handleRateChange('sandPricePerCft', e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-xl border border-gray-200 focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-600 block">Crushed Aggregate (₹/cu.ft)</label>
                <input
                  type="number"
                  value={rates.aggregatePricePerCft}
                  onChange={(e) => handleRateChange('aggregatePricePerCft', e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-xl border border-gray-200 focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-600 block">Concrete M20/M25 (₹/cu.m)</label>
                <input
                  type="number"
                  value={rates.concretePerCum}
                  onChange={(e) => handleRateChange('concretePerCum', e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-xl border border-gray-200 focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-600 block">Flooring Tiles (₹/sq.ft)</label>
                <input
                  type="number"
                  value={rates.flooringPerSqFt}
                  onChange={(e) => handleRateChange('flooringPerSqFt', e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-xl border border-gray-200 focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-600 block">Site Labor (₹/sq.ft)</label>
                <input
                  type="number"
                  value={rates.laborPerSqFt}
                  onChange={(e) => handleRateChange('laborPerSqFt', e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-xl border border-gray-200 focus:outline-none focus:border-gold"
                />
              </div>
            </div>
          </div>
        )}

        {/* Detailed Material Quantities Takeoff Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading font-bold text-lg text-charcoal">
                Civil Engineering Materials Takeoff (IS Standards)
              </h2>
              <p className="text-xs text-gray-500">
                Calculated dynamically from your actual active floor plan specifications.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-700 font-bold uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">Material / Item</th>
                  <th className="py-3 px-4">Estimated Quantity</th>
                  <th className="py-3 px-4">Specification & Standards</th>
                  <th className="py-3 px-4 text-right">Approx. Cost (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.entries(costData.quantities).map(([key, item]) => (
                  <tr key={key} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-charcoal capitalize">
                      {key}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-charcoal">
                      {item.quantity.toLocaleString()} {item.unit}
                      {item.tonnes && ` (~ ${item.tonnes} MT)`}
                      {item.brass && ` (~ ${item.brass} Brass)`}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500">{item.spec}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-charcoal">
                      {formatINR(item.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cost Distribution Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Category-wise Summary Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h3 className="font-heading font-bold text-base text-charcoal">Budget Breakdown Schedule</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 font-medium">1. Structural Materials (Cement, Steel, Bricks, Sand)</span>
                <span className="font-mono font-bold text-charcoal">{formatINR(costData.totalMaterialsCost)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 font-medium">2. Site Labor & Masonry Supervision</span>
                <span className="font-mono font-bold text-charcoal">{formatINR(costData.laborCost)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 font-medium">3. Concealed Electrical & Wiring</span>
                <span className="font-mono font-bold text-charcoal">{formatINR(costData.electricalCost)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 font-medium">4. Plumbing, Water Lines & Sanitary</span>
                <span className="font-mono font-bold text-charcoal">{formatINR(costData.plumbingCost)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 font-medium">5. Contingency & Escalation Buffer (5%)</span>
                <span className="font-mono font-bold text-charcoal">{formatINR(costData.contingency)}</span>
              </div>
              <div className="flex justify-between items-center py-3 bg-gold/10 px-3 rounded-xl border border-gold/30 text-sm">
                <span className="font-heading font-bold text-charcoal">GRAND TOTAL ESTIMATE</span>
                <span className="font-mono font-bold text-gold-dark">{formatINR(costData.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Save & Action Center */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-heading font-bold text-base text-charcoal mb-2">Save & Finalize Planning</h3>
              <p className="text-xs text-gray-500 mb-4">
                Save this design along with the active 2D floor plan, 3D walkthrough coordinates, and BOQ calculations directly to your dashboard.
              </p>

              {saveMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold mb-4 ${
                    saveMessage.includes('success')
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {saveMessage}
                </div>
              )}
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-100">
              <button
                onClick={handleSaveDesign}
                disabled={saving}
                className="w-full btn-primary py-3 text-xs gap-2 justify-center shadow-md"
              >
                <HiCheckCircle size={18} />
                {saving ? 'Saving to Dashboard...' : 'Save Design to Dashboard'}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => navigate('/floor-plans')}
                  className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-charcoal"
                >
                  Edit 2D Plan
                </button>
                <button
                  onClick={() => navigate('/3d-designer')}
                  className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-charcoal"
                >
                  View 3D House
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
