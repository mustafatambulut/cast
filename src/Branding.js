import React from 'react';
import './styles.css';
import logo from './logo.svg';
import cast from './cast.svg';

const Branding = React.memo(({ user }) => {
  console.log('USER FROM BRANDING IS HERE', user)
  return (
    <div className="branding-screen">
      <div className="branding-header">
          <div className="user-header">
            <img
              className="user-avatar"
              src={user.profileImagePath}
              alt="User Avatar"
            />
            <div className="user-info">
              <span>Connected As</span>
              <strong>{user.profileName}</strong>
            </div>
          </div>
          <img
            className="branding-logo"
            src={logo}
            alt="Brand Logo"
          />
        </div>
      <div className="branding-container">

        <div className="branding-body">
          <div className="branding-icon">
            <img
              src={cast}
              alt="Cast Icon"
            />
          </div>
          <div className="branding-text">
            <h1 className="ready-text">Ready to Cast</h1>
            <p className="description">
              You're all set! Enjoy your content on the big screen.
            </p>
          </div>
        </div>

        <footer className="branding-footer">
          <span>Version 1.6.4.0-log6</span>
        </footer>
      </div>
    </div>
  );
});

export default Branding;
