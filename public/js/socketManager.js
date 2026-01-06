/* global io */
let socketInstance = null;
export function getSocket() {
    if (!socketInstance) {
        socketInstance = io();  // assumes socket.io is globally available
    }
    return socketInstance;
}
