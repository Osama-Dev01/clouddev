import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import './edit.css';

export default function EditUser() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState({ 
    name: '', 
    message: '', 
    info: '', 
    image: null,
    imageUrl: null
  });
  const [preview, setPreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get(`http://localhost:3000/data`);
        const found = res.data.find(u => u.id === parseInt(id));
        if (found) {
          setUser(found);
          if (found.imageUrl) setPreview(found.imageUrl);
        }
      } catch (err) {
        console.error('Error fetching user:', err);
      }
    };

    fetchUser();
  }, [id]);

  const handleChange = e => {
    const { name, value } = e.target;
    setUser(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUser(prev => ({ ...prev, image: file }));
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('name', user.name);
    formData.append('message', user.message);
    formData.append('info', user.info);
    if (user.image instanceof File) {
      formData.append('photo', user.image);
    }

    try {
      await axios.put(`http://localhost:3000/data/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      navigate('/');
    } catch (err) {
      console.error('Error updating user:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="edit-user-container">
      <div className="edit-user-card">
        <h2 className="edit-user-title">Edit User</h2>
        
        <form onSubmit={handleSubmit} className="edit-user-form">
          <div className="form-group">
            <label className="form-label">Profile Photo</label>
            <div className="photo-upload-container">
              {preview ? (
                <img src={preview} alt="Preview" className="photo-preview" />
              ) : (
                <div className="photo-placeholder">
                  <i className="fas fa-user-circle"></i>
                </div>
              )}
              <label className="upload-btn">
                <input 
                  type="file" 
                  onChange={handleImageChange} 
                  accept="image/*"
                  className="file-input"
                />
                {preview ? 'Change Photo' : 'Upload Photo'}
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              type="text"
              name="name"
              value={user.name}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Message</label>
            <textarea
              name="message"
              value={user.message}
              onChange={handleChange}
              className="form-input"
              rows="3"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Info</label>
            <input
              type="text"
              name="info"
              value={user.info}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-actions">
            <button 
              type="button"
              className="cancel-btn"
              onClick={() => navigate('/')}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Updating...
                </>
              ) : (
                'Update User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}