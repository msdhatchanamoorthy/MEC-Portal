import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'https://mec-att-sys.onrender.com';

const socket = io(SOCKET_URL, {
    autoConnect: false,
    withCredentials: true
});

export default socket;
