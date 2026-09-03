'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import react-leaflet components with SSR disabled
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

// ================================================================
//  CHALLENGE CONFIGURATION
// ================================================================
const CONFIG = {
  imageUrl: "/Somewhere_Image.jpg",
  Selected_Image: "location.jpg",
  canZoom: false,
  canPan: false,
  difficulty: "easy",
  start_message: "Ok Now You are Here! \n\nBut the real test begins now.\n\nHidden within this game is the answer to something I secretly concealed while working for this company. If youâ€™re determined to uncover the truth, thereâ€™s only one task:\n\nFind the location hidden somewhere in the world.\n\nOnce you discover it, Iâ€™ll reveal the secretâ€”and tell you exactly what I hid.\n\nGood luck. Youâ€™re going to need it."
};

function MapClickHandler({ onMapClick, submitted }: { onMapClick: (latlng: { lat: number; lng: number }) => void; submitted: boolean }) {
  // We can load useMapEvents dynamically or inside a client wrapper
  const [MapEventsComp, setMapEventsComp] = useState<any>(null);

  useEffect(() => {
    import('react-leaflet').then((mod) => {
      const { useMapEvents } = mod;
      function Events() {
        useMapEvents({
          click(e: any) {
            if (submitted) return;
            onMapClick(e.latlng);
          },
        });
        return null;
      }
      setMapEventsComp(() => Events);
    });
  }, [submitted, onMapClick]);

  if (!MapEventsComp) return null;
  return <MapEventsComp />;
}

export default function Home() {
  const [banned, setBanned] = useState(false);
  const [showBriefing, setShowBriefing] = useState(true);
  const [initDone, setInitDone] = useState(false);
  const [gameVisible, setGameVisible] = useState(false);
  const [timestamp, setTimestamp] = useState('');
  const [guessIcon, setGuessIcon] = useState<any>(null);

  // Image zoom/pan state
  const [iScale, setIScale] = useState(1);
  const [iTx, setITx] = useState(0);
  const [iTy, setITy] = useState(0);
  const [panning, setPanning] = useState(false);
  const [psx, setPsx] = useState(0);
  const [psy, setPsy] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Map and guess state
  const [guessPos, setGuessPos] = useState<[number, number] | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitText, setSubmitText] = useState('SUBMIT GUESS');
  const [hintText, setHintText] = useState('Click on the map to place your guess');
  const [hintActive, setHintActive] = useState(false);

  // Results state
  const [successVisible, setSuccessVisible] = useState(false);
  const [flagDisplayText, setFlagDisplayText] = useState('');
  const [failVisible, setFailVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const imgWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const n = new Date();
    const p = (v: number) => String(v).padStart(2, '0');
    setTimestamp(
      `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())} ${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())} UTC`
    );

    import('leaflet').then((L) => {
      const icon = L.divIcon({
        className: 'guess-mk',
        html: '<div class="mk-dot"></div><div class="mk-ring"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      setGuessIcon(icon);
    });

    return () => {};
  }, []);

  const handleStartContinue = () => {
    setShowBriefing(false);
    const timer = setTimeout(() => {
      setInitDone(true);
      setTimeout(() => setGameVisible(true), 100);
    }, 2100);
  };

  // Image wheel zoom
  useEffect(() => {
    const wrap = imgWrapRef.current;
    if (!wrap || !CONFIG.canZoom) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const d = e.deltaY > 0 ? -0.15 : 0.15;
      setIScale((prevScale) => {
        const ns = Math.max(1, Math.min(7, prevScale + d));
        const r = wrap.getBoundingClientRect();
        const mx = e.clientX - r.left;
        const my = e.clientY - r.top;
        const ratio = ns / prevScale;
        setITx((prevTx) => mx - ratio * (mx - prevTx));
        setITy((prevTy) => my - ratio * (my - prevTy));
        return ns;
      });
    };

    wrap.addEventListener('wheel', handleWheel, { passive: false });
    return () => wrap.removeEventListener('wheel', handleWheel);
  }, [CONFIG.canZoom]);

  // Image pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!CONFIG.canPan || iScale <= 1) return;
    e.preventDefault();
    setPanning(true);
    setPsx(e.clientX - iTx);
    setPsy(e.clientY - iTy);
  };

  useEffect(() => {
    if (!panning) return;
    const handleMouseMove = (e: MouseEvent) => {
      setITx(e.clientX - psx);
      setITy(e.clientY - psy);
    };
    const handleMouseUp = () => {
      setPanning(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [panning, psx, psy]);

  const handleMapClick = (latlng: { lat: number; lng: number }) => {
    // 1. Introduce player_guessed_latitude and player_guessed_longitude variables
    const player_guessed_latitude = latlng.lat;
    const player_guessed_longitude = latlng.lng;
    setGuessPos([player_guessed_latitude, player_guessed_longitude]);
    setHintText(`GUESS: ${player_guessed_latitude.toFixed(4)}, ${player_guessed_longitude.toFixed(4)}`);
    setHintActive(true);
  };

  const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const toR = (x: number) => (x * Math.PI) / 180;
    const dLat = toR(lat2 - lat1);
    const dLon = toR(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(Math.max(0, a)), Math.sqrt(Math.max(0, 1 - a)));
  };

  const handleSubmit = async () => {
    if (submitted || !guessPos) return;
    setSubmitted(true);
    setSubmitText('VERIFYING...');
    
    // 3. Handle player guesses (player_guessed_latitude, player_guessed_longitude) via backend API to keep Image_Latitude/Longitude secure
    const player_guessed_latitude = guessPos[0];
    const player_guessed_longitude = guessPos[1];
    setGuessPos(null);

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_guessed_latitude, player_guessed_longitude }),
      });
      const data = await res.json();

      setTimeout(() => {
        if (data.success) {
          setSuccessVisible(true);
          const retrievedFlag = data.flag || "I wondered whether I should DoorDash my food 2025 times, or maybe 41096 times. Not that the number of times mattersâ€”itâ€™s more about whether Iâ€™m the one placing the order.";
          let i = 0;
          const iv = setInterval(() => {
            if (i < retrievedFlag.length) {
              setFlagDisplayText((prev) => prev + retrievedFlag[i]);
              i++;
            } else {
              clearInterval(iv);
            }
          }, 55);
        } else {
          setFailVisible(true);
        }
      }, 1000);
    } catch {
      setTimeout(() => {
        setFailVisible(true);
      }, 1000);
    }
  };

  const handleCopyFlag = () => {
    navigator.clipboard.writeText("I wondered whether I should DoorDash my food 2025 times, or maybe 41096 times. Not that the number of times mattersâ€”itâ€™s more about whether Iâ€™m the one placing the order.").then(() => {
      setToastVisible(true);
      setTimeout(() => setToastVisible(false), 1800);
    });
  };

  const handleExit = () => {
    window.location.reload();
  };

  if (banned) {
    return (
      <div id="banned-screen" className="fixed inset-0 z-[10000] bg-[#070a10] flex flex-col items-center justify-center text-center gap-5">
        <i className="fa-solid fa-shield-halved text-5xl text-[#ff2d55] animate-pulse"></i>
        <h1 className="font-mono text-2xl text-[#ff2d55] tracking-[8px]">ACCESS REVOKED</h1>
        <p className="text-[#5e7091] text-base max-w-[420px] leading-relaxed">
          Previous failed attempt detected. Re-access the challenge URL to try again.
        </p>
      </div>
    );
  }

  const perms = [];

  const hintParts = [];

  return (
    <>
      {/* Briefing / Start Message Screen */}
      {showBriefing && (
        <div
          id="briefing-screen"
          className="fixed inset-0 z-[10000] bg-[#070a10] flex items-center justify-center p-4 select-none"
        >
          {/* Futuristic grid overlay background specifically for briefing */}
          <div className="absolute inset-0 bg-briefing-grid opacity-10 pointer-events-none"></div>
          
          <div className="relative w-full max-w-[650px] bg-[#0c1019]/90 border border-[#00e68a]/30 p-8 md:p-12 rounded-[4px] shadow-[0_0_50px_rgba(0,230,138,0.15)] flex flex-col gap-6 overflow-hidden">
            {/* Tech decorative corners */}
            <div className="vc-b tl-b"></div>
            <div className="vc-b tr-b"></div>
            <div className="vc-b bl-b"></div>
            <div className="vc-b br-b"></div>
            
            {/* Title / Main Subject */}
            <div className="flex flex-col gap-1">
              <h1 className="font-mono text-2xl md:text-3xl tracking-[6px] text-[#00e68a] drop-shadow-[0_0_10px_rgba(0,230,138,0.4)]">
                MISSION BRIEFING
              </h1>
              <div className="h-[2px] w-[60px] bg-[#00e68a]"></div>
            </div>

            {/* Custom Briefing Message Box */}
            <div className="bg-[#050810] border border-[#00e68a]/10 p-5 rounded-[2px] min-h-[140px] flex items-center">
              <p className="font-mono text-[0.9rem] leading-relaxed text-[#e4eaf4] tracking-[1px]">
                {CONFIG.start_message}
              </p>
            </div>

            {/* Divider */}
            <div className="border-t border-[#00e68a]/10 pt-6 flex justify-between items-center">
              <div className="font-mono text-[0.65rem] text-[#2e3f5a] tracking-[1.5px] max-sm:hidden">
                PRESS TO INITIALIZE TARGETING SEQUENCE
              </div>
              
              {/* Pulsing Continue button with Arrow */}
              <button
                onClick={handleStartContinue}
                className="group ml-auto font-mono text-[0.95rem] tracking-[3px] py-2.5 px-6 bg-transparent text-[#00e68a] border border-[#00e68a] rounded-[2px] cursor-pointer transition-all duration-300 uppercase relative overflow-hidden hover:text-[#070a10] hover:shadow-[0_0_25px_rgba(0,230,138,0.4)] flex items-center gap-3 before:content-[''] before:absolute before:inset-0 before:bg-[#00e68a] before:scale-x-0 before:origin-left before:transition-transform before:duration-300 before:z-[-1] hover:before:scale-x-100"
              >
                CONTINUE 
                <span className="inline-block transform transition-transform duration-300 group-hover:translate-x-1.5">
                  &rarr;
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Init Screen */}
      <div
        id="init-screen"
        className={`fixed inset-0 z-[9999] bg-[#070a10] flex flex-col items-center justify-center gap-6 transition-opacity duration-600 ${
          initDone ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="font-mono text-[1.6rem] tracking-[8px] text-[#00e68a]">GEOSINT</div>
        <div className="w-[240px] h-[2px] bg-[#172038] rounded-[2px] overflow-hidden">
          <div className="h-full w-0 bg-[#00e68a] rounded-[2px] animate-init-fill"></div>
        </div>
        <div className="font-mono text-[0.65rem] text-[#2e3f5a] tracking-[3px]">ESTABLISHING SATELLITE LINK</div>
      </div>

      {/* Game Container */}
      <div
        id="game-container"
        className="transition-opacity duration-500 flex flex-col h-screen w-screen"
        style={{ opacity: gameVisible ? 1 : 0 }}
      >
        <header className="relative z-10 h-[52px] flex items-center justify-between px-5 bg-[#0c1019] border-b border-[#172038]">
          <div className="flex items-center gap-[10px] font-mono text-[1.15rem] tracking-[5px] text-[#00e68a] select-none">
            <div className="w-[28px] h-[28px] border-2 border-[#00e68a] rounded-full relative flex items-center justify-center after:content-[''] after:w-[7px] after:h-[7px] after:bg-[#00e68a] after:rounded-full before:content-[''] before:absolute before:w-[40px] before:h-[1px] before:bg-[#00e68a] before:opacity-30 before:rotate-[-45deg]"></div>
            GEOSINT
          </div>
          <div className="flex items-center gap-[14px]">
            <a
              href={CONFIG.imageUrl}
              download={CONFIG.Selected_Image}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[0.65rem] tracking-[2px] px-3 py-1.5 bg-[#00e68a]/10 border border-[#00e68a] text-[#00e68a] rounded-[2px] hover:bg-[#00e68a] hover:text-[#070a10] transition-all duration-300 uppercase flex items-center gap-2"
            >
              <i className="fa-solid fa-download"></i> DOWNLOAD IMAGE
            </a>
            <span className={`font-mono text-[0.65rem] tracking-[3px] px-[14px] py-[3px] border rounded-[2px] uppercase ${CONFIG.difficulty === 'easy' ? 'text-[#00e68a] border-[#00e68a] bg-[rgba(0,230,138,0.12)]' : CONFIG.difficulty === 'medium' ? 'text-[#f59e0b] border-[#f59e0b] bg-[rgba(245,158,11,0.1)]' : 'text-[#ff2d55] border-[#ff2d55] bg-[rgba(255,45,85,0.12)]'}`}>
              {CONFIG.difficulty}
            </span>
          </div>
        </header>

        <main className="relative z-50 grid grid-cols-2 h-[calc(100vh-52px-58px)] max-md:grid-cols-1 max-md:grid-rows-[1fr_1fr]">
          <div id="image-panel" className="relative overflow-hidden bg-black border-r border-[#172038] max-md:border-r-0 max-md:border-b max-md:border-[#172038]">
            <div
              ref={imgWrapRef}
              className={`w-full h-full overflow-hidden relative ${CONFIG.canPan ? 'cursor-grab' : ''} ${panning ? 'cursor-grabbing' : ''}`}
              onMouseDown={handleMouseDown}
            >
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 z-1 bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.025)] to-transparent animate-[shim_1.8s_infinite]"></div>
              )}
              {imageError && (
                <div className="absolute inset-0 z-1 flex items-center justify-center font-mono text-[0.75rem] text-[#ff2d55] tracking-[2px]">
                  IMAGE LOAD FAILED
                </div>
              )}
              <img
                id="cimg"
                src={CONFIG.imageUrl}
                alt="Challenge location"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                className={`w-full h-full object-cover transform-origin-center transition-transform duration-75 select-none [-webkit-user-drag:none] ${!CONFIG.canZoom && !CONFIG.canPan ? 'pointer-events-none' : ''}`}
                style={{
                  transform: `translate(${iTx}px, ${iTy}px) scale(${iScale})`,
                }}
              />
              <div className="scanl"></div>
              <div className="vign"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-4 pointer-events-none xhair before:content-[''] before:absolute before:bg-[#00e68a] before:opacity-20 before:w-[1px] before:h-[28px] before:left-0 before:-top-[14px] after:content-[''] after:absolute after:bg-[#00e68a] after:opacity-20 after:w-[28px] after:h-[1px] after:top-0 after:-left-[14px]"></div>
              <div className="vc tl"></div>
              <div className="vc tr"></div>
              <div className="vc bl"></div>
              <div className="vc br"></div>
              <div className="absolute top-[18px] left-[20px] font-mono text-[0.6rem] text-[#00e68a] tracking-[2px] opacity-60 z-5">SAT-FEED // CH-07</div>
              <div className="absolute top-[18px] right-[20px] flex items-center gap-[6px] font-mono text-[0.65rem] text-[#ff2d55] z-5 tracking-[2px]">
                <div className="rec-dot"></div>REC
              </div>
              <div className="absolute bottom-[18px] right-[20px] font-mono text-[0.6rem] text-[#2e3f5a] tracking-[1px] z-5">{timestamp}</div>
              <div className="absolute bottom-[18px] right-[20px] font-mono text-[0.6rem] text-[#2e3f5a] tracking-[1px] z-5">{timestamp}</div>
            </div>
          </div>
          <div id="map-panel" className="relative w-full h-full">
            <MapContainer center={[25, 10]} zoom={2} zoomControl={true} attributionControl={false} style={{ width: '100%', height: '100%', background: '#070a10' }}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_2v3m_1_c2c62688332feab4288f8a8d"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>'
              subdomains="abcd"
              maxZoom={20}
            />
              <MapClickHandler onMapClick={handleMapClick} submitted={submitted} />
              {guessPos && guessIcon && <Marker position={guessPos} icon={guessIcon} />}
            </MapContainer>
          </div>
        </main>

        <footer className="relative z-10 h-[58px] flex items-center justify-center gap-[18px] bg-[#0c1019] border-t border-[#172038]">
          <span className={`font-mono text-[0.65px] tracking-[1px] transition-colors duration-300 text-[#2e3f5a] ${hintActive ? 'text-[#00b4d8]' : ''}`}>
            {hintText}
          </span>
          <button
            id="submit-btn"
            onClick={handleSubmit}
            disabled={!guessPos || submitted}
            className="font-mono text-[0.8rem] tracking-[3px] px-[36px] py-[9px] bg-transparent text-[#00e68a] border border-[#00e68a] cursor-pointer transition-all duration-300 uppercase relative overflow-hidden disabled:opacity-25 disabled:cursor-not-allowed disabled:border-[#2e3f5a] disabled:text-[#2e3f5a] hover:text-[#070a10] before:content-[''] before:absolute before:inset-0 before:bg-[#00e68a] before:scale-x-0 before:origin-left before:transition-transform before:duration-300 before:z-[-1] hover:before:scale-x-100"
          >
            {submitText}
          </button>
        </footer>
      </div>

      {/* Success Overlay */}
      {successVisible && (
        <div id="success-ov" className="fixed inset-0 z-[1000] bg-[#070a10] flex flex-col items-center justify-center gap-[22px] animate-[fadeUp_0.5s_ease]">
          <div className="font-mono text-[1.1rem] text-[#00e68a] tracking-[6px] opacity-0 animate-[slideUp_0.5s_ease_0.3s_forwards]">
            CONGRATULATIONS! YOU FOUND THE LOCATION. Here is the Hint
          </div>
          <div
            id="flag-box"
            onClick={handleCopyFlag}
            className="bg-[#050810] border border-[#00e68a] py-[22px] px-[32px] font-mono text-[1.1rem] md:text-[1.25rem] text-[#00e68a] tracking-[1.5px] leading-relaxed w-[90%] max-w-[850px] text-center relative opacity-0 animate-[slideUp_0.5s_ease_0.7s_forwards] cursor-pointer shadow-[0_0_40px_rgba(0,230,138,0.12),inset_0_0_40px_rgba(0,230,138,0.12)] hover:shadow-[0_0_60px_rgba(0,230,138,0.35),inset_0_0_50px_rgba(0,230,138,0.12)] transition-shadow duration-300 max-md:text-[0.95rem] max-md:py-[16px] max-md:px-[18px]"
          >
            <span id="flag-text">{flagDisplayText}</span>
            <span className="flag-cur"></span>
          </div>
        </div>
      )}

      {/* Failure Modal */}
      {failVisible && (
        <div id="fail-modal" className="fixed inset-0 z-[1000] bg-[rgba(7,10,16,0.93)] flex flex-col items-center justify-center gap-[18px] animate-[fadeUp_0.4s_ease] backdrop-blur-[10px]">
          <i className="fa-solid fa-xmark text-[44px] text-[#ff2d55] animate-pulse"></i>
          <div className="font-mono text-[1.6rem] text-[#ff2d55] tracking-[6px]">ACCESS DENIED</div>
          <div className="text-[1.05rem] text-[#5e7091] tracking-[1px]">Good luck next time</div>
          <button
            id="exit-btn"
            onClick={handleExit}
            className="font-mono text-[0.8rem] tracking-[3px] px-[44px] py-[11px] bg-[#ff2d55] text-white border-none cursor-pointer transition-all duration-300 uppercase mt-[8px] hover:bg-[#ff1a40] hover:shadow-[0_0_24px_rgba(255,45,85,0.12)] hover:scale-[1.03]"
          >
            EXIT
          </button>
        </div>
      )}

      {/* Toast */}
      <div
        id="copy-toast"
        className={`fixed bottom-[30px] left-1/2 -translate-x-1/2 font-mono text-[0.7rem] text-[#00e68a] tracking-[2px] bg-[#111827] border border-[#00e68a] py-[8px] px-[20px] z-[2000] transition-all duration-300 ease-in-out pointer-events-none ${
          toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}
      >
        COPIED TO CLIPBOARD
      </div>
    </>
  );
}
