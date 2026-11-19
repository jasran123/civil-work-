import { Link } from 'react-router-dom';
import { HiOutlineHomeModern } from 'react-icons/hi2';

export default function Footer() {
  return (
    <footer className="site-footer mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gold text-white rounded-lg flex items-center justify-center">
                <HiOutlineHomeModern size={19} />
              </div>
              <span className="font-heading font-bold text-lg">
                Dream Home <span className="site-footer-blue">3D Planner</span>
              </span>
            </div>
            <p className="site-footer-muted text-sm max-w-sm">
              State-of-the-art interactive 2D architectural planning, synchronized real-time 3D walkthroughs, and precise Indian construction cost estimators.
            </p>
            <div className="bg-gold/10 border border-gold/30 rounded-xl p-3 max-w-md">
              <p className="text-xs site-footer-blue leading-relaxed">
                ⚠️ <strong>Statutory Disclaimer:</strong> All architectural layouts, room measurements, and cost metrics are preliminary conceptual representations. They must be validated by a registered structural engineer and certified architect before physical construction.
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-heading text-sm font-semibold tracking-wider uppercase site-footer-blue mb-3">Navigation</h4>
            <ul className="space-y-2 text-sm site-footer-muted">
              <li><Link to="/land-measurement" className="hover:text-gold transition-colors">House Plans</Link></li>
              <li><Link to="/floor-plans" className="hover:text-gold transition-colors">2D Generator</Link></li>
              <li><Link to="/3d-designer" className="hover:text-gold transition-colors">3D Designer</Link></li>
              <li><Link to="/cost-calculator" className="hover:text-gold transition-colors">Cost Calculator</Link></li>
              <li><Link to="/gallery" className="hover:text-gold transition-colors">Design Gallery</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading text-sm font-semibold tracking-wider uppercase site-footer-blue mb-3">Civil Specs</h4>
            <p className="text-xs site-footer-muted mb-2">Conforms to Indian Standard codes & IS 456-2000 structural guidelines.</p>
            <div className="text-xs site-footer-muted space-y-1">
              <p>• Ground Coverage & Setback calculation</p>
              <p>• Vastu Shastra orientation support</p>
              <p>• Dynamic material index calculations</p>
            </div>
          </div>
        </div>

        <div className="border-t site-footer-line mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center text-xs site-footer-muted">
          <p>© {new Date().getFullYear()} Dream Home 3D Planner. All rights reserved.</p>
          <p className="mt-2 sm:mt-0">Designed for Indian Architects, Civil Engineers & Homeowners.</p>
        </div>
      </div>
    </footer>
  );
}
