import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './client.css'; // Assuming you have a CSS file for styling

function App() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch data from the backend
  const fetchData = async () => {
    try {
      const res = await axios.get('http://localhost:3000/data');
      setUsers(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const deleteUser = async (id) => {
    try {
      await axios.delete(`http://localhost:3000/data/${id}`);
      fetchData(); 
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="user-list-container">
      <h2 className="user-list-header">Users</h2>
      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading users...</p>
        </div>
      ) : (
        <div className="user-grid">
          {users.map((user) => (
            <div key={user.id} className="user-card">
              {user.imageUrl && (
                <div className="user-image-container">
                  <img 
                    src={user.imageUrl} 
                    alt={user.name} 
                    className="user-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <div className="image-placeholder" style={{ display: 'none' }}>
                    <i className="fas fa-user-circle"></i>
                  </div>
                </div>
              )}
              <div className="user-details">
                <h3>{user.name}</h3>
                <p className="user-message">{user.message}</p>
                <p className="user-info">{user.info}</p>
              </div>
              <div className="user-actions">
                <button 
                  onClick={() => deleteUser(user.id)} 
                  className="delete-btn"
                >
                  <i className="fas fa-trash-alt"></i> Delete
                </button>
                <Link to={`/edit/${user.id}`} className="edit-link">
                  <i className="fas fa-edit"></i> Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;