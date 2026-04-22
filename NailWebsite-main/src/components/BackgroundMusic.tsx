import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const BackgroundMusic = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Debug: Log audio element state
    console.log('Audio element found:', audio);
    console.log('Audio src:', audio.src);

    const handleCanPlay = () => {
      console.log('Audio can play - file loaded successfully');
      setAudioLoaded(true);
    };

    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      console.error('Audio error code:', audio.error?.code);
      console.error('Audio error message:', audio.error?.message);
    };

    const handleLoadStart = () => {
      console.log('Audio load started');
    };

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);

    // Log when audio is actually playing
    const handleTimeUpdate = () => {
      if (audio.currentTime > 0 && audio.currentTime < 1) {
        console.log('Audio time update - currentTime:', audio.currentTime, 'volume:', audio.volume);
      }
    };
    audio.addEventListener('timeupdate', handleTimeUpdate);

    // Attempt to auto-play when component mounts
    const playAudio = async () => {
      try {
        await audio.play();
        setIsPlaying(true);
        console.log('Background music started playing');
      } catch (error) {
        console.log('Auto-play blocked by browser. User interaction required.');
        setIsPlaying(false);
      }
    };

    // Small delay to ensure audio element is ready
    const timer = setTimeout(playAudio, 500);

    return () => {
      clearTimeout(timer);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  const togglePlay = async () => {
    const audio = audioRef.current;
    console.log('Toggle play clicked');
    console.log('Audio element:', audio);
    console.log('Current isPlaying state:', isPlaying);
    console.log('Audio loaded:', audioLoaded);
    
    if (audio) {
      console.log('Audio readyState:', audio.readyState);
      console.log('Audio paused:', audio.paused);
      console.log('Audio duration:', audio.duration);
      console.log('Audio volume:', audio.volume);
      console.log('Audio muted:', audio.muted);
      console.log('Audio currentTime:', audio.currentTime);
      
      // Ensure volume is set
      audio.volume = 1.0;
      audio.muted = false;
      
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        setIsMuted(false);
        console.log('Audio paused');
      } else {
        try {
          console.log('Attempting to play with volume:', audio.volume);
          await audio.play();
          setIsPlaying(true);
          console.log('Audio now playing! CurrentTime:', audio.currentTime);
        } catch (error) {
          console.error('Error playing audio:', error);
        }
      }
    } else {
      console.error('Audio element not found!');
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src="/Dilemma (feat. Kelly Rowland).mp3" // Ensure this path is correct
        loop
        preload="auto"
      />

      {/* Floating music control button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={togglePlay}
          className="bg-[#FF8CAA] hover:bg-[#FF6B96] text-white p-4 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110"
          aria-label={isPlaying ? 'Pause music' : 'Play music'}
        >
          {isPlaying && !isMuted ? (
            <Volume2 size={24} />
          ) : (
            <VolumeX size={24} />
          )}
        </button>
      </div>
    </>
  );
};

export default BackgroundMusic;
