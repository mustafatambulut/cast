import React from 'react';
import './styles.css';
import logo from './bein-logo.svg';

const Branding = React.memo(() => {
  return (
    <div className="branding-screen">
      <div className="branding-container">

        <div className="branding-body">
          <div className="branding-text">
            <img
              className="branding-logo"
              src={logo}
              alt="Brand Logo"
            />
          </div>
        </div>

        <footer className="branding-footer">
          <span>Version 1.2.51</span>
        </footer>
      </div>
    </div>
  );
}); 

export default Branding;
