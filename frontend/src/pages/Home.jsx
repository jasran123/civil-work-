import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiOutlineCube,
  HiOutlineCalculator,
  HiOutlinePhotograph,
  HiOutlineTemplate,
  HiOutlineCheckCircle
} from 'react-icons/hi';

export default function Home() {
  return (
    <div className="overflow-hidden">
      <section className="site-home-hero flex items-center pt-24">
        <div className="max-w-7xl w-full mx-auto px-5 sm:px-8 lg:px-12 py-14 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-5 max-w-3xl">
              Design your home in <span className="site-footer-blue">2D and 3D</span>
            </h1>

            <p className="max-w-2xl site-footer-muted text-base sm:text-lg mb-7 leading-relaxed">
              Measure your plot, draw a separate layout for each floor, and explore the finished design in daylight. Estimate materials and costs as the plan evolves.
            </p>

            <div className="flex flex-wrap gap-3 items-center">
              <Link to="/3d-designer" className="btn-primary text-sm px-5 py-2.5 gap-2">
                <HiOutlineCube size={18} /> Open 3D Studio
              </Link>
              <Link to="/land-measurement" className="btn-secondary text-sm px-5 py-2.5">
                Measure a plot
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-24 bg-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="section-title">Architectural Engineering Suite</h2>
            <p className="text-gray-600 mt-3 text-base">
              A comprehensive toolkit for plot owners, architects, and civil engineering enthusiasts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="card p-8 bg-white border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-gold/10 text-gold flex items-center justify-center mb-6">
                  <HiOutlineTemplate size={28} />
                </div>
                <h3 className="font-heading text-xl font-bold mb-3">Automatic 2D Floor Plans</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Generates multiple room layout options according to your plot length, width, setbacks, and Vastu direction.
                </p>
              </div>
              <Link to="/land-measurement" className="text-gold font-semibold text-sm mt-6 inline-flex items-center gap-1 hover:underline">
                Generate Plan →
              </Link>
            </div>

            <div className="card p-8 bg-white border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-gold/10 text-gold flex items-center justify-center mb-6">
                  <HiOutlineCube size={28} />
                </div>
                <h3 className="font-heading text-xl font-bold mb-3">Interactive 3D Visualizer</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Real-time Three.js 3D synchronization with 360° rotation, day/night lighting simulation, customizable wall colors and roofing.
                </p>
              </div>
              <Link to="/3d-designer" className="text-gold font-semibold text-sm mt-6 inline-flex items-center gap-1 hover:underline">
                Launch 3D →
              </Link>
            </div>

            <div className="card p-8 bg-white border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-gold/10 text-gold flex items-center justify-center mb-6">
                  <HiOutlineCalculator size={28} />
                </div>
                <h3 className="font-heading text-xl font-bold mb-3">Cost & Material Estimator</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Calculates cement, steel, bricks, sand quantities and trade labor costs in Indian Rupees with full PDF export.
                </p>
              </div>
              <Link to="/cost-calculator" className="text-gold font-semibold text-sm mt-6 inline-flex items-center gap-1 hover:underline">
                Estimate Budget →
              </Link>
            </div>

            <div className="card p-8 bg-white border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-gold/10 text-gold flex items-center justify-center mb-6">
                  <HiOutlinePhotograph size={28} />
                </div>
                <h3 className="font-heading text-xl font-bold mb-3">Curated Design Gallery</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Explore contemporary Indian duplexes, modern villas, traditional haveli concepts, and budget-friendly layouts.
                </p>
              </div>
              <Link to="/gallery" className="text-gold font-semibold text-sm mt-6 inline-flex items-center gap-1 hover:underline">
                Browse Gallery →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="section-title">Step-by-Step Workflow</h2>
            <p className="text-gray-600 mt-2">How your custom house plan comes to life</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="text-center p-6 rounded-2xl bg-gray-50 border border-gray-100">
              <div className="w-12 h-12 bg-charcoal text-gold font-bold text-lg rounded-xl flex items-center justify-center mx-auto mb-4">
                1
              </div>
              <h3 className="font-heading font-semibold text-lg mb-2">Input Land Specs</h3>
              <p className="text-sm text-gray-600">Enter plot dimensions in feet, select road-facing direction, floors, and total budget.</p>
            </div>

            <div className="text-center p-6 rounded-2xl bg-gray-50 border border-gray-100">
              <div className="w-12 h-12 bg-charcoal text-gold font-bold text-lg rounded-xl flex items-center justify-center mx-auto mb-4">
                2
              </div>
              <h3 className="font-heading font-semibold text-lg mb-2">Customize 2D & 3D</h3>
              <p className="text-sm text-gray-600">Cycle through design variations, reposition or resize rooms, and observe synchronized 3D updates.</p>
            </div>

            <div className="text-center p-6 rounded-2xl bg-gray-50 border border-gray-100">
              <div className="w-12 h-12 bg-charcoal text-gold font-bold text-lg rounded-xl flex items-center justify-center mx-auto mb-4">
                3
              </div>
              <h3 className="font-heading font-semibold text-lg mb-2">Estimate & Export</h3>
              <p className="text-sm text-gray-600">Review civil material estimates, customize construction rates, save to dashboard, or download PDF.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-charcoal text-white py-16 border-t border-white/10">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
            Start Planning Your Ideal Home Today
          </h2>
          <p className="text-gray-400 text-sm sm:text-base mb-8 max-w-xl mx-auto">
            Free, browser-based, no complex CAD installations required. Fully optimized for desktop and mobile devices.
          </p>
          <Link to="/land-measurement" className="btn-primary text-base px-8 py-3.5">
            Launch Planner
          </Link>
        </div>
      </section>
    </div>
  );
}
