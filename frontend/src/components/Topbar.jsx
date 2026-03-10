import React from 'react';

const Topbar = ({ title, subtitle }) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <header className="topbar">
            <div className="topbar-left">
                <h1>{title}</h1>
                {subtitle && <p>{subtitle}</p>}
            </div>
            <div className="topbar-right">
                <div className="topbar-date">📅 {dateStr}</div>
            </div>
        </header>
    );
};

export default Topbar;
