import React from 'react';

interface ProgressBarProps {
  min: number;
  max: number;
  current: number;
  width?: string;
  height?: string;
  backgroundColor?: string;
  foregroundColor?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  min,
  max,
  current,
  width = '100px',
  height = '20px',
  backgroundColor = "darkgrey",
  foregroundColor = 'white',
}) => {
  const normalizedValue = ((current - min) / (max - min)) * 100;

  const barStyle: React.CSSProperties = {
    width: `${normalizedValue}%`,
    height,
    backgroundColor: foregroundColor,
    transition: 'width 0.3s ease-in-out',
  };

  const containerStyle: React.CSSProperties = {
    width,
    height,
    backgroundColor,
    borderRadius: '4px',
    overflow: 'hidden',
  };

  return (
    <div style={containerStyle}>
      <div style={barStyle} />
    </div>
  );
};

export default ProgressBar;