import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './adduser.css';
export default function AddUser() {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [info, setInfo] = useState('');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('message', message);
    formData.append('info', info);
    if (photo) {
      formData.append('photo', photo);
    }

    try {
      await axios.post('http://localhost:3000/data', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setName('');
      setMessage('');
      setInfo('');
      setPhoto(null);
      setPreview('');
      navigate('/'); 
    } catch (error) {
      console.error('Error adding user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="add-user-container">
      <div className="add-user-card">
        <h1 className="add-user-title">Add New User</h1>
        
        <form onSubmit={handleSubmit} className="add-user-form">
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
                  onChange={handlePhotoChange} 
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="form-input"
              rows="3"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Info</label>
            <input
              type="text"
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <button 
            type="submit" 
            className="submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Submitting...
              </>
            ) : (
              'Submit User'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}