import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
    const [role, setRole] = useState('principal');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { isDarkMode, toggleTheme } = useTheme();

    // Interactive Animation State
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [focusState, setFocusState] = useState('idle'); // 'idle', 'email', 'password'
    const [loginStatus, setLoginStatus] = useState('idle'); // 'idle', 'success', 'error'

    const { login } = useAuth();
    const navigate = useNavigate();

    // Smart Role Detection
    useEffect(() => {
        const lowerEmail = email.toLowerCase();
        if (lowerEmail.includes('@student')) setRole('student');
        else if (lowerEmail.includes('.ca@') || lowerEmail.includes('.staff@')) setRole('staff');
        else if (lowerEmail.includes('.hod@')) setRole('hod');
        else if (lowerEmail.includes('principal@')) setRole('principal');
    }, [email]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (focusState !== 'idle' || loginStatus !== 'idle') return;
            const x = (e.clientX / window.innerWidth - 0.5) * 15;
            const y = (e.clientY / window.innerHeight - 0.5) * 15;
            setMousePos({ x, y });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [focusState, loginStatus]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setLoginStatus('idle');

        try {
            const user = await login(email, password, role);
            setLoginStatus('success');
            toast.success(`Welcome back, ${user.name.split(' ')[0]}! 👋`);

            setTimeout(() => {
                if (user.role === 'principal') navigate('/principal');
                else if (user.role === 'hod') navigate('/hod');
                else if (user.role === 'staff') navigate('/staff');
                else if (user.role === 'student') navigate('/student');
            }, 1200);
        } catch (err) {
            const msg = err.response?.data?.message || 'Login failed. Please try again.';
            setError(msg);
            setLoginStatus('error');
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleFocus = (field) => {
        setFocusState(field);
        if (loginStatus === 'error') setLoginStatus('idle');
    };

    // --- Animation Configurations ---
    const isSuccess = loginStatus === 'success';
    const isError = loginStatus === 'error';
    const isPwd = focusState === 'password' && !showPassword && !isSuccess && !isError;
    const isEmail = focusState === 'email' && !isSuccess && !isError;

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

    // Base eye movement
    let eyeOffsetX = mousePos.x;
    let eyeOffsetY = mousePos.y;

    if (isSuccess) {
        eyeOffsetX = 0;
        eyeOffsetY = -4; // Look up happily
    } else if (isError) {
        eyeOffsetX = 0;
        eyeOffsetY = 6; // Look down sadly
    } else if (isEmail) {
        if (isMobile) {
            eyeOffsetX = 0;
            eyeOffsetY = 8; // Look DOWN at the form on mobile
        } else {
            eyeOffsetX = 8; // Look RIGHT at the form on desktop
            eyeOffsetY = 1;
        }
    } else if (isPwd) {
        eyeOffsetX = 0; // Look down/center when eyes closed
        eyeOffsetY = 4;
    }

    const eyeTransform = {
        transform: `translate(${eyeOffsetX}px, ${eyeOffsetY}px)`,
        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
    };

    // Eye states (Open/Closed/Expressions)
    const eyeBaseStyle = {
        transition: 'all 0.2s ease-out',
        opacity: (isPwd || isSuccess || isError) ? 0 : 1
    };
    const pwdEyeStyle = { transition: 'all 0.2s ease-out', opacity: isPwd ? 1 : 0 };
    const successEyeStyle = { transition: 'all 0.2s ease-out', opacity: isSuccess ? 1 : 0 };
    const errorEyeStyle = { transition: 'all 0.2s ease-out', opacity: isError ? 1 : 0 };

    // Body Transforms (Leaning and Hunching)
    const getBodyTransform = (shape) => {
        const baseTransition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
        const anim = isError ? 'headShake 0.6s ease-in-out' : 'none';

        if (isSuccess) {
            if (shape === 'blue') return { transform: 'translate(0, -15px)', transition: baseTransition, transformOrigin: 'bottom center', animation: anim };
            if (shape === 'black') return { transform: 'translate(0, -20px)', transition: baseTransition, transformOrigin: 'bottom center', animation: anim };
            if (shape === 'yellow') return { transform: 'translate(0, -10px)', transition: baseTransition, transformOrigin: 'bottom center', animation: anim };
            if (shape === 'violet') return { transform: 'translate(0, -12px)', transition: baseTransition, transformOrigin: 'bottom center', animation: anim };
        } else if (isError) {
            if (shape === 'blue') return { transform: 'rotate(-5deg) translate(-5px, 5px)', transition: baseTransition, transformOrigin: 'bottom center', animation: anim };
            if (shape === 'black') return { transform: 'rotate(5deg) translate(5px, 10px)', transition: baseTransition, transformOrigin: 'bottom center', animation: anim };
            if (shape === 'yellow') return { transform: 'rotate(-3deg) translate(-2px, 8px)', transition: baseTransition, transformOrigin: 'bottom center', animation: anim };
            if (shape === 'violet') return { transform: 'scale(1.05, 0.95) translate(0, 15px)', transition: baseTransition, transformOrigin: 'bottom center', animation: anim };
        } else if (isEmail) {
            if (isMobile) {
                // Front vanthu kela paakara maari (Scale up and lean forward)
                if (shape === 'blue') return { transform: 'scale(1.18) translate(0, 25px)', transition: baseTransition, transformOrigin: 'bottom center', animation: anim };
                if (shape === 'black') return { transform: 'scale(1.15) translate(0, 30px)', transition: baseTransition, transformOrigin: 'bottom center', animation: anim };
                if (shape === 'yellow') return { transform: 'scale(1.15) rotate(-5deg) translate(-15px, 20px)', transition: baseTransition, transformOrigin: 'bottom center', animation: anim };
                if (shape === 'violet') return { transform: 'scale(1.15) rotate(5deg) translate(15px, 15px)', transition: baseTransition, transformOrigin: 'bottom center', animation: anim };
            } else {
                // Extreme lean right (Etti paakura)
                if (shape === 'blue') return { transform: 'rotate(22deg) scale(1.05) translate(35px, -8px)', transition: baseTransition, transformOrigin: 'bottom center', animation: anim };
                if (shape === 'black') return { transform: 'rotate(28deg) translate(45px, -15px)', transition: baseTransition, transformOrigin: 'bottom left', animation: anim };
                if (shape === 'yellow') return { transform: 'rotate(15deg) translate(25px, 5px)', transition: baseTransition, transformOrigin: 'bottom center', animation: anim };
                if (shape === 'violet') return { transform: 'rotate(18deg) scale(1.1, 0.9) translate(35px, 8px)', transition: baseTransition, transformOrigin: 'bottom center', animation: anim };
            }
        } else if (isPwd) {
            // Hunch down / Close eyes (NO SPLITTING)
            if (shape === 'blue') return { transform: 'scale(0.95) translate(0, 10px)', transition: baseTransition, transformOrigin: 'bottom center', animation: anim };
            if (shape === 'black') return { transform: 'scale(1, 0.85) translate(0, 15px)', transition: baseTransition, transformOrigin: 'bottom center', animation: anim };
            if (shape === 'yellow') return { transform: 'scale(1, 0.85) translate(0, 10px)', transition: baseTransition, transformOrigin: 'bottom center', animation: anim };
            if (shape === 'violet') return { transform: 'scale(0.95, 0.9) translate(0, 8px)', transition: baseTransition, transformOrigin: 'bottom center', animation: anim };
        }
        // Idle breathing or mouse follow
        const hoverX = mousePos.x * 0.4;
        const hoverY = mousePos.y * 0.4;
        return { transform: `translate(${hoverX}px, ${hoverY}px)`, transition: 'transform 0.1s ease-out', animation: anim };
    };

    const getDropStyle = (delay) => ({
        animation: `dropIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s both`
    });

    return (
        <div className="flex min-h-screen w-full p-4 sm:p-8 font-sans items-center justify-center relative overflow-y-auto transition-all duration-500" style={{ background: 'var(--gray-50)' }}>
            <style>
                {`
                @keyframes headShake {
                    0%, 100% { transform: translateX(0) rotate(0deg); }
                    15% { transform: translateX(-15px) rotate(-8deg); }
                    30% { transform: translateX(15px) rotate(8deg); }
                    45% { transform: translateX(-15px) rotate(-8deg); }
                    60% { transform: translateX(15px) rotate(8deg); }
                    75% { transform: translateX(-7px) rotate(-4deg); }
                }
                @keyframes dropIn {
                    0% { transform: translateY(-500px); opacity: 0; }
                    60% { transform: translateY(30px); opacity: 1; }
                    80% { transform: translateY(-10px); opacity: 1; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                `}
            </style>

            {/* Theme Toggle in Login */}
            <button
                onClick={toggleTheme}
                className="absolute top-6 right-6 z-50 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl hover:scale-110 transition-all text-xl"
                style={{ background: 'var(--glass-bg)', color: 'var(--gray-900)' }}
            >
                {isDarkMode ? '🌙' : '☀️'}
            </button>

            {/* Dynamic Background Orbs */}
            <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full opacity-30 blur-[120px]" style={{ background: 'var(--primary)' }}></div>
            <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full opacity-30 blur-[120px]" style={{ background: 'var(--accent)' }}></div>
            <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] rounded-full opacity-20 blur-[80px]" style={{ background: 'var(--secondary)' }}></div>

            <div className="flex flex-col lg:flex-row w-full max-w-5xl rounded-[32px] overflow-hidden shadow-2xl min-h-[640px] relative z-10 backdrop-blur-sm border border-white/10" style={{ background: 'var(--glass-bg)' }}>

                {/* Left Side - Cartoon Graphic */}
                <div className="flex w-full lg:w-1/2 bg-white/5 relative items-center justify-center p-6 lg:p-12 overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10 h-64 lg:h-auto">
                    <svg viewBox="0 0 400 400" className="w-full max-w-[280px] lg:max-w-md drop-shadow-2xl overflow-visible" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <clipPath id="eye-blue-l"><circle cx="165" cy="145" r="15" /></clipPath>
                            <clipPath id="eye-blue-r"><circle cx="215" cy="145" r="15" /></clipPath>
                            <clipPath id="eye-black-l"><circle cx="238" cy="225" r="12" /></clipPath>
                            <clipPath id="eye-black-r"><circle cx="262" cy="225" r="12" /></clipPath>
                            <clipPath id="eye-yellow-l"><circle cx="295" cy="230" r="12" /></clipPath>
                            <clipPath id="eye-yellow-r"><circle cx="325" cy="230" r="12" /></clipPath>
                            <clipPath id="eye-violet-l"><circle cx="125" cy="282" r="11" /></clipPath>
                            <clipPath id="eye-violet-r"><circle cx="170" cy="282" r="11" /></clipPath>
                        </defs>

                        {/* Blue Character Group (Organic Blob Shape) */}
                        <g style={getDropStyle(0.4)}>
                            <g style={getBodyTransform('blue')}>
                                <path
                                    d="M110 85 Q95 85 95 105 L85 220 Q85 245 115 245 L235 255 Q265 255 265 230 L275 115 Q275 85 245 85 Z"
                                    fill="#3B82F6"
                                    className="drop-shadow-lg"
                                />
                                {/* Eye Sockets */}
                                <circle cx="165" cy="145" r="15" fill="white" />
                                <circle cx="215" cy="145" r="15" fill="white" />

                                <g clipPath="url(#eye-blue-l)">
                                    <g style={eyeTransform}><circle cx="165" cy="145" r="9" fill="#1A1A1A" style={eyeBaseStyle} /></g>
                                </g>
                                <g clipPath="url(#eye-blue-r)">
                                    <g style={eyeTransform}><circle cx="215" cy="145" r="9" fill="#1A1A1A" style={eyeBaseStyle} /></g>
                                </g>

                                <g style={eyeTransform}>
                                    {/* Password State: Clean Dashes --- */}
                                    <path d="M 155 145 L 175 145 M 205 145 L 225 145" stroke="#1A1A1A" strokeWidth="4" style={pwdEyeStyle} strokeLinecap="round" />
                                    {/* Success Happy Eyes ^^ */}
                                    <path d="M 156 150 Q 165 135 174 150 M 206 150 Q 215 135 224 150" stroke="#1A1A1A" fill="none" strokeWidth="3" style={successEyeStyle} strokeLinecap="round" />
                                    {/* Error Sad Eyes XX */}
                                    <path d="M 156 140 L 174 152 M 174 140 L 156 152 M 206 140 L 224 152 M 224 140 L 206 152" stroke="#1A1A1A" strokeWidth="3" style={errorEyeStyle} strokeLinecap="round" />
                                </g>
                            </g>
                        </g>

                        {/* Black Pillar Character */}
                        <g style={getDropStyle(0.3)}>
                            <g style={getBodyTransform('black')}>
                                <path d="M220 200 Q220 185 245 185 Q270 185 270 200 L270 310 Q270 325 245 325 Q220 325 220 310 Z" fill="#1E293B" />
                                <circle cx="238" cy="225" r="12" fill="white" />
                                <circle cx="262" cy="225" r="12" fill="white" />

                                <g clipPath="url(#eye-black-l)">
                                    <g style={eyeTransform}><circle cx="238" cy="225" r="7" fill="#1A1A1A" style={eyeBaseStyle} /></g>
                                </g>
                                <g clipPath="url(#eye-black-r)">
                                    <g style={eyeTransform}><circle cx="262" cy="225" r="7" fill="#1A1A1A" style={eyeBaseStyle} /></g>
                                </g>

                                <g style={eyeTransform}>
                                    {/* Password State: Dash --- */}
                                    <path d="M 230 225 L 246 225 M 254 225 L 270 225" stroke="#1A1A1A" strokeWidth="4" style={pwdEyeStyle} strokeLinecap="round" />
                                    <path d="M 231 228 Q 238 218 245 228 M 255 228 Q 262 218 269 228" stroke="#1A1A1A" fill="none" strokeWidth="3" style={successEyeStyle} strokeLinecap="round" />
                                    <path d="M 231 220 L 245 230 M 255 230 L 269 220" stroke="#1A1A1A" strokeWidth="3" style={errorEyeStyle} strokeLinecap="round" />
                                </g>
                            </g>
                        </g>

                        {/* Yellow Shape Group */}
                        <g style={getDropStyle(0.15)}>
                            <g style={getBodyTransform('yellow')}>
                                <path d="M 270 200 A 45 45 0 0 1 360 200 L 360 320 L 270 320 Z" fill="#FACC15" />
                                <circle cx="295" cy="230" r="12" fill="white" />
                                <circle cx="325" cy="230" r="12" fill="white" />

                                <g clipPath="url(#eye-yellow-l)">
                                    <g style={eyeTransform}><circle cx="295" cy="230" r="7" fill="#1A1A1A" style={eyeBaseStyle} /></g>
                                </g>
                                <g clipPath="url(#eye-yellow-r)">
                                    <g style={eyeTransform}><circle cx="325" cy="230" r="7" fill="#1A1A1A" style={eyeBaseStyle} /></g>
                                </g>

                                <g style={eyeTransform}>
                                    {/* Password State: Dash --- */}
                                    <path d="M 288 230 L 302 230 M 318 230 L 332 230" stroke="#1A1A1A" strokeWidth="4" style={pwdEyeStyle} strokeLinecap="round" />
                                    <path d="M 289 233 Q 295 224 301 233 M 319 233 Q 325 224 331 233" stroke="#1A1A1A" fill="none" strokeWidth="3" style={successEyeStyle} strokeLinecap="round" />
                                    <path d="M 289 224 L 301 236 M 301 224 L 289 236 M 319 224 L 331 236 M 331 224 L 319 236" stroke="#1A1A1A" strokeWidth="3" style={errorEyeStyle} strokeLinecap="round" />
                                    <path
                                        d={isSuccess ? "M 295 245 Q 310 260 325 245" :
                                            isError ? "M 300 255 Q 310 245 320 255" :
                                                isPwd ? "M 295 250 L 325 250" :
                                                    isEmail ? "M 300 255 L 320 245" :
                                                        "M 300 250 Q 310 255 320 250"}
                                        stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" fill="none" style={{ transition: 'all 0.3s' }}
                                    />
                                </g>
                            </g>
                        </g>

                        {/* Violet Shape Group */}
                        <g style={getDropStyle(0)}>
                            <g style={getBodyTransform('violet')}>
                                <path d="M 50 320 A 110 110 0 0 1 270 320 Z" fill="#8B5CF6" />
                                <circle cx="125" cy="282" r="11" fill="white" opacity="0.9" />
                                <circle cx="170" cy="282" r="11" fill="white" opacity="0.9" />

                                <g clipPath="url(#eye-violet-l)">
                                    <g style={eyeTransform}><circle cx="125" cy="282" r="6" fill="#1A1A1A" style={eyeBaseStyle} /></g>
                                </g>
                                <g clipPath="url(#eye-violet-r)">
                                    <g style={eyeTransform}><circle cx="170" cy="282" r="6" fill="#1A1A1A" style={eyeBaseStyle} /></g>
                                </g>

                                <g style={eyeTransform}>
                                    {/* Password State: Dash --- */}
                                    <path d="M 118 282 L 132 282 M 163 282 L 177 282" stroke="#1A1A1A" strokeWidth="4" style={pwdEyeStyle} strokeLinecap="round" />
                                    <path d="M 119 285 Q 125 276 131 285 M 164 285 Q 170 276 176 285" stroke="#1A1A1A" fill="none" strokeWidth="3" style={successEyeStyle} strokeLinecap="round" />
                                    <path d="M 119 279 L 131 285 M 164 285 L 176 279" stroke="#1A1A1A" strokeWidth="3" style={errorEyeStyle} strokeLinecap="round" />
                                    <path
                                        d={isSuccess ? "M 130 300 Q 150 325 170 300" :
                                            isError ? "M 135 315 Q 150 300 165 315" :
                                                isPwd ? "M 130 305 L 170 305" :
                                                    "M 140 305 Q 150 315 160 305"}
                                        stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round" fill="none" style={{ transition: 'all 0.3s' }}
                                    />
                                </g>
                            </g>
                        </g>
                    </svg>
                </div>

                {/* Right Side - Login Form */}
                <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 sm:p-16 z-10">
                    <div className="w-full max-w-sm">

                        {/* Top Official Logo */}
                        <div className="flex justify-center mb-6">
                            <div className="w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-xl p-2 border border-white/10" style={{ background: 'var(--glass-bg)' }}>
                                <img src="/logo.png" alt="MEC Logo" className="w-full h-full object-contain drop-shadow-md" />
                            </div>
                        </div>

                        <h1 className="text-3xl font-black text-center mb-2 font-['Syne',sans-serif] tracking-tight" style={{ color: 'var(--gray-900)' }}>MEC Portal</h1>
                        <p className="text-center text-sm mb-8 font-medium" style={{ color: 'var(--gray-500)' }}>MEC Attendance System</p>

                        {/* Role Selection */}
                        <div className="flex p-1 rounded-2xl mb-8 border border-white/5" style={{ background: 'var(--gray-100)' }}>
                            {['principal', 'hod', 'staff', 'student'].map((r) => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => setRole(r)}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-tighter rounded-xl transition-all duration-300 ${role === r ? 'shadow-xl text-white' : 'text-gray-500 hover:text-gray-900'
                                        }`}
                                    style={role === r ? { background: 'var(--accent-gradient)' } : {}}
                                >
                                    {r === 'staff' ? 'Advisor' : r}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleSubmit}>
                            {/* Email Field */}
                            <div className="mb-6 relative group">
                                <label className="block text-xs font-black uppercase tracking-widest mb-2 pl-1" style={{ color: 'var(--gray-500)' }}>Email or Roll Number</label>
                                <input
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => handleFocus('email')}
                                    onBlur={() => setFocusState('idle')}
                                    placeholder="Enter Email or Roll Number"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm font-semibold transition-all focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                                    style={{ background: 'var(--gray-100)', color: 'var(--gray-900)', borderColor: 'var(--gray-200)' }}
                                />
                            </div>

                            <div className="mb-6 relative group">
                                <label className="block text-xs font-black uppercase tracking-widest mb-2 pl-1" style={{ color: 'var(--gray-500)' }}>Secure Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onFocus={() => handleFocus('password')}
                                        onBlur={() => setFocusState('idle')}
                                        placeholder="••••••••"
                                        required
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 pr-12 text-sm font-semibold transition-all focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                                        style={{ background: 'var(--gray-100)', color: 'var(--gray-900)', borderColor: 'var(--gray-200)' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 transition-all"
                                        tabIndex="-1"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Remember & Forgot Password */}
                            <div className="flex items-center justify-between mb-8">
                                <label className="flex items-center text-sm font-medium cursor-pointer transition-colors" style={{ color: 'var(--gray-600)' }}>
                                    <input type="checkbox" className="mr-2 w-4 h-4 rounded border-gray-300 accent-violet-500" />
                                    Remember session
                                </label>
                                <a href="/forgot-password" className="text-sm font-bold hover:underline transition-colors" style={{ color: 'var(--primary)' }}>
                                    Reset Password?
                                </a>
                            </div>

                            {error && (
                                <div className="mb-4 text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-center">
                                    {error}
                                </div>
                            )}

                            {/* Log In Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full text-white rounded-xl py-4 text-base font-black uppercase tracking-widest shadow-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center mb-6"
                                style={{ background: 'var(--accent-gradient)' }}
                            >
                                {loading ? (
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    'Secure Access'
                                )}
                            </button>
                        </form>

                        <div className="mt-4 text-center">
                            <p className="text-sm font-medium" style={{ color: 'var(--gray-500)' }}>
                                Having trouble? <a href="#" className="font-bold ml-1 hover:underline" style={{ color: 'var(--primary)' }}>Contact Support</a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
