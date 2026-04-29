import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

const VoiceControl = ({ commands, active = true }) => {
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState(null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech recognition not supported in this browser.");
            return;
        }

        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;
        recognitionInstance.lang = 'en-US';

        recognitionInstance.onstart = () => {
            setIsListening(true);
            toast.success('Listening for voice commands...', { id: 'voice-status', icon: '🎙️' });
        };

        recognitionInstance.onend = () => {
            setIsListening(false);
            // toast('Stopped listening', { id: 'voice-status', icon: '🔇' });
        };

        recognitionInstance.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
            console.log('Voice Command Received:', transcript);

            let matched = false;
            for (const cmd of commands) {
                if (cmd.regex.test(transcript)) {
                    const match = transcript.match(cmd.regex);
                    cmd.handler(match);
                    matched = true;
                    break;
                }
            }

            if (!matched) {
                toast(`Heard: "${transcript}"`, { id: 'voice-debug', icon: '❓' });
            } else {
                toast.success(`Action: "${transcript}"`, { id: 'voice-debug', icon: '🎯' });
            }
        };

        recognitionInstance.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
            if (event.error === 'not-allowed') {
                toast.error('Microphone access denied');
            }
        };

        setRecognition(recognitionInstance);

        return () => {
            recognitionInstance.stop();
        };
    }, [commands]);

    const toggleListening = () => {
        if (!recognition) {
            toast.error('Speech recognition not supported');
            return;
        }

        if (isListening) {
            recognition.stop();
        } else {
            try {
                recognition.start();
            } catch (e) {
                console.error(e);
            }
        }
    };

    if (!active) return null;

    return (
        <div className="voice-control-trigger" style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 1000 }}>
            <button
                className={`btn-voice ${isListening ? 'listening' : ''}`}
                onClick={toggleListening}
                title={isListening ? 'Stop Listening' : 'Start Voice Control'}
                style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    border: 'none',
                    background: isListening ? 'var(--danger)' : 'var(--primary)',
                    color: '#fff',
                    fontSize: '24px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative'
                }}
            >
                {isListening ? '🛑' : '🎙️'}
                {isListening && <span className="voice-pulse"></span>}
            </button>
            <style>{`
                .btn-voice:hover { transform: scale(1.1); }
                .btn-voice.listening { animation: pulse-bg 1.5s infinite; }
                .voice-pulse {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    background: var(--danger);
                    opacity: 0.5;
                    animation: pulse-ring 1.5s infinite;
                }
                @keyframes pulse-ring {
                    0% { transform: scale(0.8); opacity: 0.5; }
                    100% { transform: scale(2); opacity: 0; }
                }
                @keyframes pulse-bg {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                    70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
            `}</style>
        </div>
    );
};

export default VoiceControl;
