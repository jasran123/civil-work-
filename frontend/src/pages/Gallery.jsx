import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDesign } from '../context/DesignContext';

const DESIGNS = [
  {
    id: 'gal-1',
    title: 'Modern Minimalist Villa',
    category: 'Modern',
    bhk: '3BHK',
    plotSize: '40 × 50 ft',
    length: 50,
    width: 40,
    floors: 2,
    estCost: '₹ 45 - 55 Lakh',
    bg: 'from-amber-700 to-amber-950',
    description: 'Clean architectural geometry, double-height ceiling over living hall, large glazing, open terrace.',
  },
  {
    id: 'gal-2',
    title: 'Traditional Kerala Courtyard Home',
    category: 'Traditional',
    bhk: '3BHK',
    plotSize: '45 × 40 ft',
    length: 45,
    width: 40,
    floors: 1,
    estCost: '₹ 38 - 48 Lakh',
    bg: 'from-emerald-800 to-teal-950',
    description: 'Central Nadumuttam courtyard, sloping terracotta tile roof with carved wooden pillars and wide veranda.',
  },
  {
    id: 'gal-3',
    title: 'Contemporary Luxury Duplex',
    category: 'Duplex',
    bhk: '4BHK',
    plotSize: '50 × 40 ft',
    length: 50,
    width: 40,
    floors: 2,
    estCost: '₹ 65 - 80 Lakh',
    bg: 'from-slate-700 to-slate-900',
    description: 'Four ensuite master bedrooms, family lounge on G+1, covered two-car parking porch and servant room.',
  },
  {
    id: 'gal-4',
    title: 'Budget Compact Urban Home',
    category: 'Small-Budget',
    bhk: '2BHK',
    plotSize: '30 × 30 ft',
    length: 30,
    width: 30,
    floors: 1,
    estCost: '₹ 18 - 25 Lakh',
    bg: 'from-stone-700 to-stone-900',
    description: 'Optimized space utility without wasted corridor areas. Ideal for 900 sq.ft town plots.',
  },
  {
    id: 'gal-5',
    title: 'Rajasthani Jharokha Haveli',
    category: 'Traditional',
    bhk: '3BHK',
    plotSize: '40 × 45 ft',
    length: 45,
    width: 40,
    floors: 2,
    estCost: '₹ 50 - 62 Lakh',
    bg: 'from-orange-800 to-red-950',
    description: 'Intricate sandstone facade finishes, arched entrance portico, Vastu compliant pooja mandir.',
  },
  {
    id: 'gal-6',
    title: 'Modern Compact 1BHK Cottage',
    category: 'Small-Budget',
    bhk: '1BHK',
    plotSize: '25 × 30 ft',
    length: 30,
    width: 25,
    floors: 1,
    estCost: '₹ 14 - 18 Lakh',
    bg: 'from-cyan-800 to-blue-950',
    description: 'Smart studio cottage plan with open kitchen, spacious master bed, and garden veranda.',
  },
];

export default function Gallery() {
  const navigate = useNavigate();
  const { updateDesign } = useDesign();

  const [activeCategory, setActiveCategory] = useState('All');
  const [activeBHK, setActiveBHK] = useState('All');

  const filteredDesigns = DESIGNS.filter((d) => {
    if (activeCategory !== 'All' && d.category !== activeCategory) return false;
    if (activeBHK !== 'All' && d.bhk !== activeBHK) return false;
    return true;
  });

  const handleUseDesign = (d) => {
    updateDesign({
      landLength: d.length,
      landWidth: d.width,
      landArea: d.length * d.width,
      houseType: d.bhk,
      floors: d.floors,
    });
    navigate('/floor-plans');
  };

  return (
    <div className="min-h-screen pt-28 pb-16 bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs uppercase font-bold tracking-widest text-gold mb-2 block">
            Architectural Inspirations
          </span>
          <h1 className="section-title">Design Gallery</h1>
          <p className="text-gray-600 text-sm mt-2">
            Browse verified modern, traditional Indian, duplex, and cost-optimized architectural concepts.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 mr-2">Category:</span>
            {['All', 'Modern', 'Traditional', 'Duplex', 'Small-Budget'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeCategory === cat
                    ? 'bg-gold text-charcoal shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 mr-2">Size:</span>
            {['All', '1BHK', '2BHK', '3BHK', '4BHK'].map((bhk) => (
              <button
                key={bhk}
                onClick={() => setActiveBHK(bhk)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeBHK === bhk
                    ? 'bg-charcoal text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {bhk}
              </button>
            ))}
          </div>
        </div>

        {/* Designs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredDesigns.map((d) => (
            <div key={d.id} className="card bg-white border border-gray-100 overflow-hidden flex flex-col justify-between">
              <div>
                {/* Visual Header Representation */}
                <div className={`h-48 bg-gradient-to-br ${d.bg} p-6 flex flex-col justify-between text-white relative`}>
                  <div className="flex justify-between items-start">
                    <span className="px-2.5 py-1 rounded-full bg-black/30 backdrop-blur text-[11px] font-semibold text-gold-light border border-white/10">
                      {d.category}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-black/30 backdrop-blur text-[11px] font-semibold text-white">
                      {d.bhk} • {d.floors} Floor{d.floors > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-heading font-bold text-xl leading-tight mb-1">{d.title}</h3>
                    <p className="text-xs text-white/80 font-mono">Plot: {d.plotSize}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="p-6">
                  <p className="text-xs text-gray-600 leading-relaxed mb-4">{d.description}</p>
                  <div className="flex justify-between items-center text-xs py-2 border-t border-gray-100">
                    <span className="text-gray-500">Estimated Civil Budget:</span>
                    <span className="font-bold text-charcoal">{d.estCost}</span>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6 pt-2">
                <button
                  onClick={() => handleUseDesign(d)}
                  className="w-full btn-secondary text-xs py-2.5"
                >
                  Load Layout in 2D/3D Planner →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
