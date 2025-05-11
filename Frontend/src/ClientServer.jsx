import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './client.css';

function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data from the backend
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('http://localhost:3000/data');
      setUsers(res.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load users. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id) => {
    try {
      await axios.delete(`http://localhost:3000/data/${id}`);
      fetchData(); // Refresh the list after deletion
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user.');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="user-list-container">
      <div className="header-section">
        <h2 className="user-list-header">User Directory</h2>
        <Link to="/add" className="add-user-btn">
          <i className="fas fa-plus"></i> Add New User
        </Link>
      </div>

      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i> {error}
          <button onClick={fetchData} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-users-slash"></i>
          <p>No users found</p>
          <Link to="/add" className="add-user-btn">
            Add Your First User
          </Link>
        </div>
      ) : (
        <div className="user-grid">
          {users.map((user) => (
            <div key={user.id} className="user-card">
              <div className="user-image-container">
                {user.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt={user.name}
                    className="user-image"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/default-user.png';
                      e.target.classList.add('image-error');
                    }}
                  />
                ) : (
                  <div className="image-placeholder">
                    <i className="fas fa-user-circle"></i>
                  </div>
                )}
              </div>

              <div className="user-details">
                <h3 className="user-name">{user.name}</h3>
                {user.message && (
                  <p className="user-message">
                    <i className="fas fa-comment"></i> {user.message}
                  </p>
                )}
                {user.info && (
                  <p className="user-info">
                    <i className="fas fa-info-circle"></i> {user.info}
                  </p>
                )}
              </div>

              <div className="user-actions">
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this user?')) {
                      deleteUser(user.id);
                    }
                  }}
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

export default UserList;