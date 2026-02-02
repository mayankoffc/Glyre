import React, { memo } from 'react';

interface PaperSheetProps {
  children: React.ReactNode;
  className?: string;
  isScannerMode?: boolean;
  marginLabels?: { lineIndex: number; label: string }[];
  lineSpacing?: number;
}

const PaperSheetComponent: React.FC<PaperSheetProps> = ({ 
  children, 
  className = '', 
  isScannerMode = false,
  marginLabels = [],
  lineSpacing = 2.4
}) => {
  return (
    <div className={`relative transition-all duration-500 ease-in-out ${isScannerMode ? 'p-4' : 'p-0'}`}>
      <div 
        className={`relative mx-auto overflow-hidden ${className} ${isScannerMode ? 'scanner-mode' : 'shadow-2xl'}`}
        style={{
          width: '21cm',
          height: '29.7cm',
          maxWidth: '100%',
          aspectRatio: '210 / 297',
          backgroundColor: isScannerMode ? '#f0f0f0' : '#fffef8',
          filter: isScannerMode ? 'contrast(1.3) brightness(1.05) grayscale(0.1)' : 'none',
          transform: isScannerMode ? 'rotate(-0.3deg) scale(0.98)' : 'none',
          boxShadow: isScannerMode ? '5px 10px 15px rgba(0,0,0,0.3)' : '0 10px 40px rgba(0,0,0,0.4)',
          border: '1px solid #d0d0d0',
        }}
      >
        {/* Paper texture */}
        {!isScannerMode && (
          <div className="absolute inset-0 opacity-30 pointer-events-none z-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.12'/%3E%3C/svg%3E")`,
              mixBlendMode: 'multiply'
            }}
          />
        )}
        
        {/* Subtle paper grain */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(#000 0.3px, transparent 0.3px)`,
            backgroundSize: '15px 15px',
          }}
        />

        {/* Horizontal ruled lines - dynamic spacing */}
        <div className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: `linear-gradient(to bottom, transparent ${lineSpacing - 0.05}rem, #a1aebf ${lineSpacing - 0.05}rem, #a1aebf ${lineSpacing}rem, transparent ${lineSpacing}rem)`,
            backgroundSize: `100% ${lineSpacing}rem`,
            backgroundPosition: '0 4rem',
            opacity: isScannerMode ? 0.8 : 0.5
          }}
        />

        {/* Red margin line - double line like real notebooks */}
        <div 
          className="absolute top-0 bottom-0 z-0"
          style={{
            left: '30mm',
            width: '0.5mm',
            backgroundColor: 'rgba(220, 80, 80, 0.5)',
          }}
        />
        <div 
          className="absolute top-0 bottom-0 z-0"
          style={{
            left: '32mm',
            width: '0.5mm',
            backgroundColor: 'rgba(220, 80, 80, 0.35)',
          }}
        />
        
        {/* Top margin line */}
        <div 
          className="absolute left-0 right-0 z-0"
          style={{
            top: '25mm',
            height: '0.5mm',
            backgroundColor: 'rgba(220, 80, 80, 0.4)',
          }}
        />

        {/* Page number and date area - top right */}
        <div className="absolute z-10" style={{ top: '8mm', right: '15mm' }}>
          <div className="flex flex-col gap-1 items-end opacity-60">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '8px', fontFamily: 'sans-serif', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Page No.
              </span>
              <div style={{ width: '35px', borderBottom: '1px solid #999' }} />
            </div>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '8px', fontFamily: 'sans-serif', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Date
              </span>
              <div style={{ width: '45px', borderBottom: '1px solid #999' }} />
            </div>
          </div>
        </div>

        {/* Left margin area for Q numbers, (a), (b), etc */}
        <div 
          className="absolute z-10"
          style={{
            left: '5mm',
            top: '4rem',
            width: '22mm',
            height: 'calc(100% - 6rem)',
          }}
        >
          {marginLabels.map((item, idx) => {
            const seed = item.lineIndex * 17 + idx;
            const randomRotate = Math.sin(seed) * 1.5;
            const randomDrift = Math.cos(seed * 2) * 1;
            
            return (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  top: `${item.lineIndex * lineSpacing}rem`,
                  left: `${2 + randomDrift}mm`,
                  height: `${lineSpacing}rem`,
                  display: 'flex',
                  alignItems: 'center',
                  fontFamily: "'Caveat', cursive",
                  fontSize: '15px',
                  color: '#0a2472',
                  transform: `rotate(${randomRotate}deg)`,
                  whiteSpace: 'nowrap',
                  opacity: 0.9,
                }}
              >
                {item.label}
              </div>
            );
          })}
        </div>

        {/* Main content area - paddingTop matches ruled lines start (4rem) */}
        <div 
          className={`relative z-10 ${isScannerMode ? 'contrast-125' : ''}`}
          style={{
            marginLeft: '5rem',
            marginRight: '2rem',
            paddingTop: '4rem',
            paddingBottom: '2.5rem',
            minHeight: '100%',
          }}
        >
          {children}
        </div>

        {/* Left edge shadow for 3D effect */}
        {!isScannerMode && (
          <div 
            className="absolute top-0 left-0 bottom-0 pointer-events-none z-20"
            style={{
              width: '15mm',
              background: 'linear-gradient(to right, rgba(0,0,0,0.08) 0%, transparent 100%)'
            }}
          />
        )}

        {/* Slight paper curl effect on corners */}
        {!isScannerMode && (
          <>
            <div 
              className="absolute pointer-events-none z-20"
              style={{
                bottom: 0,
                right: 0,
                width: '20mm',
                height: '20mm',
                background: 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.03) 100%)',
              }}
            />
          </>
        )}
        
        {/* Scanner mode vignette */}
        {isScannerMode && (
          <div className="absolute inset-0 pointer-events-none z-40"
            style={{
              background: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.08) 85%, rgba(0,0,0,0.15) 100%)'
            }}
          />
        )}
      </div>
    </div>
  );
};

export const PaperSheet = memo(PaperSheetComponent);
