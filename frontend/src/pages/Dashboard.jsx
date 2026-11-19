import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDesign } from '../context/DesignContext';
import API from '../utils/api';
import { formatINR } from '../utils/costCalculator';
import { describeDesignPlot } from '../utils/plotProject';
import { floorLabel, getFloorDetails, getFloorLayouts } from '../utils/projectState';
import { HiPlus, HiTrash, HiOutlineCube, HiOutlineDocumentText } from 'react-icons/hi';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { openProject, resetDesign } = useDesign();

  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
    if (user) {
      fetchDesigns();
    }
  }, [user, authLoading]);

  const fetchDesigns = async () => {
    try {
      const res = await API.get('/designs');
      setDesigns(res.data);
    } catch (err) {
      setError('Could not fetch saved designs. Ensure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this saved house design?')) return;
    try {
      await API.delete(`/designs/${id}`);
      setDesigns((prev) => prev.filter((d) => d._id !== id));
    } catch (err) {
      alert('Failed to delete design.');
    }
  };

  const handleOpenDesign = (d) => {
    openProject(d);
    const hasBuilding = getFloorLayouts(d).some((floor) => floor.length)
      || getFloorDetails(d).some((floor) => floor.walls.length || floor.furniture.length);
    navigate(d.plot && !hasBuilding ? '/land-measurement' : '/floor-plans');
  };

  const handleDownloadPDF = (d) => {
    const doc = new jsPDF();
    doc.setFillColor(30, 30, 36);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(212, 175, 55);
    doc.setFontSize(20);
    doc.text('DREAM HOME 3D PLANNER', 14, 18);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(`Design Summary: ${d.name}`, 14, 26);

    doc.setTextColor(30, 30, 36);
    doc.setFontSize(11);
    doc.text(`Plot: ${describeDesignPlot(d)}`, 14, 46);
    doc.text(`Configuration: ${d.houseType} • ${d.floors} Floor(s) • ${d.roadFacing} Facing`, 14, 53);
    if (d.costEstimate?.totalCost) {
      doc.text(`Estimated Total Civil Budget: ${formatINR(d.costEstimate.totalCost)}`, 14, 60);
    }

    const roomRows = getFloorLayouts(d).flatMap((rooms, floor) => rooms.map((room) => [
      floorLabel(floor),
      room.name,
      `${room.width}' × ${room.height}'`,
      `${room.width * room.height} sq.ft`,
    ]));

    doc.autoTable({
      startY: 68,
      head: [['Floor', 'Room / Space', 'Dimensions', 'Area']],
      body: roomRows,
      theme: 'striped',
      headStyles: { fillColor: [212, 175, 55], textColor: [30, 30, 36] },
    });

    doc.save(`${d.name.replace(/\s+/g, '_')}_Plan.pdf`);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen pt-28 flex items-center justify-center bg-cream">
        <div className="w-10 h-10 border-4 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-16 bg-cream">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="section-title text-2xl md:text-3xl">My Saved House Designs</h1>
            <p className="text-xs text-gray-500 mt-1">
              Signed in as <span className="font-semibold text-charcoal">{user?.name}</span> ({user?.email})
            </p>
          </div>

          <button
            onClick={() => { resetDesign(); navigate('/land-measurement'); }}
            className="btn-primary text-xs py-2.5 px-4 gap-2"
          >
            <HiPlus size={16} /> New House Plan
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs">
            {error}
          </div>
        )}

        {designs.length === 0 ? (
          <div className="card p-12 text-center bg-white border border-gray-100 max-w-lg mx-auto">
            <div className="w-16 h-16 bg-gold/10 text-gold rounded-3xl flex items-center justify-center mx-auto mb-4">
              <HiOutlineCube size={32} />
            </div>
            <h3 className="font-heading font-bold text-lg text-charcoal mb-2">No Saved Designs Yet</h3>
            <p className="text-xs text-gray-500 mb-6">
              Start by entering your land dimensions and click "Save Design" from the Cost Calculator page.
            </p>
            <button
              onClick={() => navigate('/land-measurement')}
              className="btn-primary text-xs py-2.5 px-6"
            >
              Start Designing
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {designs.map((d) => (
              <div key={d._id} className="card bg-white border border-gray-100 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-heading font-bold text-lg text-charcoal leading-tight">{d.name}</h3>
                    <button
                      onClick={() => handleDelete(d._id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete design"
                    >
                      <HiTrash size={18} />
                    </button>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-600 mb-4">
                    <p>• Plot: {describeDesignPlot(d)}</p>
                    <p>• Configuration: {d.houseType} • {d.floors} Floor(s)</p>
                    <p>• Road: {d.roadFacing} Facing</p>
                    {d.costEstimate?.totalCost && (
                      <p className="font-semibold text-charcoal pt-1">
                        • Estimated Cost: {formatINR(d.costEstimate.totalCost)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleOpenDesign(d)}
                    className="flex-1 btn-primary text-xs py-2 gap-1.5"
                  >
                    <HiOutlineCube size={16} /> Open design
                  </button>
                  <button
                    onClick={() => handleDownloadPDF(d)}
                    className="p-2 border border-gray-200 hover:border-gold hover:text-gold rounded-xl text-gray-600 transition-colors"
                    title="Download PDF"
                  >
                    <HiOutlineDocumentText size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
