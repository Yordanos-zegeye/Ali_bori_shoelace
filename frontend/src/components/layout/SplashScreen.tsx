import React, { useState, useEffect, useRef } from 'react';
import splashVideo from '../../assets/splash_screen.mp4';

interface SplashScreenProps {
  onComplete: () => void;
  isLoading?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  isLoading = false,
}) => {
  const [isExiting, setIsExiting] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const exitCalledRef = useRef<boolean>(false);
  const mountedAtRef = useRef<number>(Date.now());

  const handleExit = () => {
    if (exitCalledRef.current) return;
    exitCalledRef.current = true;
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 600);
  };

  // Click anywhere to skip into the application
  const handleContainerClick = () => {
    if (Date.now() - mountedAtRef.current > 200) {
      handleExit();
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Enforce DOM-level muted property to satisfy modern browser autoplay policies
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const playVideo = () => {
      video.play().catch((err) => {
        console.warn('Autoplay error:', err);
      });
    };

    if (video.readyState >= 2) {
      playVideo();
    } else {
      video.addEventListener('canplay', playVideo, { once: true });
      video.addEventListener('loadeddata', playVideo, { once: true });
    }

    return () => {
      video.removeEventListener('canplay', playVideo);
      video.removeEventListener('loadeddata', playVideo);
    };
  }, []);

  // When video completes natural playback
  const handleVideoEnded = () => {
    if (!isLoading) {
      handleExit();
    }
  };

  // 10.5s safety timer matching video length
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoading) {
        handleExit();
      }
    }, 10500);

    return () => clearTimeout(timer);
  }, [isLoading]);

  return (
    <div
      onClick={handleContainerClick}
      className={`fixed inset-0 z-50 w-screen h-screen bg-[#ECE5D8] flex items-center justify-center select-none cursor-pointer overflow-hidden transition-all duration-700 ease-out ${
        isExiting
          ? 'opacity-0 scale-102 blur-md pointer-events-none'
          : 'opacity-100 scale-100'
      }`}
    >
      {/* Edge-to-Edge Fullscreen Video from Assets */}
      <video
        ref={(el) => {
          videoRef.current = el;
          if (el) {
            el.muted = true;
            el.defaultMuted = true;
          }
        }}
        src={splashVideo}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={handleVideoEnded}
        className="w-full h-full object-cover bg-[#ECE5D8] pointer-events-none"
      />
    </div>
  );
};
