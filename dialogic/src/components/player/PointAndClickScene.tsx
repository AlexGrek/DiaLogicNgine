import { PointAndClickZoneRenderView } from "../../exec/RenderView";
import React, { useState } from 'react';
import { PointAndClickZone } from "../../game/PointAndClick";
import { generateImageUrlCss } from "../../Utils";

interface PointAndClickSceneProps {
    backgroundImage: string;
    zones: PointAndClickZoneRenderView[];
    onZoneClick?: (zone: PointAndClickZone) => void;
}

const PointAndClickScene: React.FC<PointAndClickSceneProps> = ({
    backgroundImage,
    zones,
    onZoneClick
}) => {
    const [hoveredZone, setHoveredZone] = useState<string | null>(null);

    const handleZoneClick = (zone: PointAndClickZone) => {
        if (onZoneClick) {
            onZoneClick(zone);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.aspectRatioBox}>
                <div style={styles.content}>
                    {/* Background Layer */}
                    <div
                        style={{
                            ...styles.backgroundLayer,
                            backgroundImage: generateImageUrlCss(backgroundImage)
                        }}
                    />

                    {/* Foreground Layer with Zones */}
                    <div style={styles.foregroundLayer}>
                        {zones.map(zone => {
                            const isHovered = hoveredZone === zone.zone.id;
                            const opacity = isHovered
                                ? (zone.zone.hoverOpacity ?? 0.9)
                                : (zone.zone.idleOpacity ?? 0.3);

                            return (
                                <div
                                    key={zone.zone.id}
                                    style={{
                                        ...styles.zone,
                                        left: `${zone.zone.x}%`,
                                        top: `${zone.zone.y}%`,
                                        width: `${zone.zone.width}%`,
                                        height: `${zone.zone.height}%`,
                                        opacity: opacity,
                                        backgroundImage: zone.zone.image ? generateImageUrlCss(zone.zone.image) : 'none',
                                        backgroundColor: zone.zone.image ? 'transparent' : 'rgba(255, 255, 100, 0.5)',
                                    }}
                                    onMouseEnter={() => setHoveredZone(zone.zone.id)}
                                    onMouseLeave={() => setHoveredZone(null)}
                                    onClick={() => handleZoneClick(zone.zone)}
                                >
                                    {isHovered && (
                                        <div style={styles.zoneName}>
                                            {zone.zone.name}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Styles
const styles: { [key: string]: React.CSSProperties } = {
    container: {
        width: '100%',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    aspectRatioBox: {
        position: 'relative',
        width: '100%',
        maxWidth: '100vw',
        maxHeight: '100vh',
        aspectRatio: '16 / 9',
    },
    content: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
    },
    backgroundLayer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
    },
    foregroundLayer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
    },
    zone: {
        position: 'absolute',
        pointerEvents: 'auto',
        cursor: 'pointer',
        transition: 'opacity 0.2s ease',
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        border: '2px solid transparent',
        boxSizing: 'border-box',
    },
    zoneName: {
        position: 'absolute',
        bottom: '-30px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: '#fff',
        padding: '6px 12px',
        borderRadius: '4px',
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
    },
};

export default PointAndClickScene;
