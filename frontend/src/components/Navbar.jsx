import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { HiOutlineBars3, HiOutlineHomeModern, HiOutlineMoon, HiOutlineSun, HiOutlineXMark } from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';

const LINKS = [['/', 'Home'], ['/land-measurement', 'Land plots'], ['/floor-plans', '2D Planner'], ['/3d-designer', '3D Studio'], ['/cost-calculator', 'Cost calculator'], ['/gallery', 'Gallery']];

export default function Navbar({ theme, toggleTheme }) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const close = () => setIsOpen(false);
  const ThemeIcon = theme === 'dark' ? HiOutlineSun : HiOutlineMoon;
  const Account = ({ mobile = false }) => user ? <>
    <NavLink to="/dashboard" onClick={mobile ? close : undefined}>My Designs</NavLink>
    <button type="button" onClick={() => { logout(); close(); }}>Sign out</button>
  </> : <>
    <NavLink to="/login" onClick={mobile ? close : undefined}>Sign in</NavLink>
    <Link className="site-nav-register" to="/register" onClick={mobile ? close : undefined}>Register</Link>
  </>;

  return <nav className="site-nav" aria-label="Main navigation">
    <div className="site-nav-inner">
      <Link to="/" onClick={close} className="site-brand"><span><HiOutlineHomeModern size={22} /></span>Dream Home <strong>3D</strong></Link>
      <div className="site-nav-links">{LINKS.map(([route, label]) => <NavLink key={route} to={route} end={route === '/'}>{label}</NavLink>)}</div>
      <div className="site-nav-actions">
        <div className="site-nav-account"><Account /></div>
        <button className="site-nav-icon" type="button" title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggleTheme}><ThemeIcon size={18} /></button>
        <button className="site-nav-icon site-nav-mobile-toggle" aria-expanded={isOpen} aria-controls="mobile-main-links" aria-label={isOpen ? 'Close navigation' : 'Open navigation'} type="button" onClick={() => setIsOpen(!isOpen)}>{isOpen ? <HiOutlineXMark size={23} /> : <HiOutlineBars3 size={23} />}</button>
      </div>
    </div>
    {isOpen && <div className="site-nav-mobile" id="mobile-main-links">
      {LINKS.map(([route, label]) => <NavLink key={route} to={route} end={route === '/'} onClick={close}>{label}</NavLink>)}
      <div className="site-nav-mobile-account"><Account mobile /></div>
    </div>}
  </nav>;
}
