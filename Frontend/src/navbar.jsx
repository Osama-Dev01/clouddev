import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from './AuthContext'; 
import './navbar.css';

function NavBar() {
  const { isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="cloud-navbar">
      <div className="navbar-brand">
        <span className="logo-part">Sky</span>
        <span className="logo-part-alt">Vault</span>
      </div>
      
      <div className="nav-center-links">
        <NavLink 
          to="/" 
          className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
        >
          Dashboard
        </NavLink>
        <NavLink 
          to="/addUser" 
          className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
        >
          Add New
        </NavLink>
      </div>

      {isLoggedIn && (
        <button 
          onClick={handleLogout} 
          className="logout-btn"
        >
          <i className="fas fa-sign-out-alt"></i> Sign Out
        </button>
      )}
    </nav>
  );
}

export default NavBar;