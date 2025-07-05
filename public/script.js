const socket = io();
let localStream;
let peerConnection;
const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

const shareBtn = document.getElementById('shareBtn');
const viewBtn = document.getElementById('viewBtn');
const roomInput = document.getElementById('roomInput');
const remoteVideo = document.getElementById('remoteVideo');

shareBtn.onclick = async () => {
  const roomId = prompt('Enter room code to share your screen:');
  if (!roomId) return alert('Room code required');

  socket.emit('join-room', roomId, 'sharer');

  try {
    localStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
  } catch (err) {
    return alert('Failed to get screen stream: ' + err.message);
  }

  peerConnection = new RTCPeerConnection(config);

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.onicecandidate = event => {
    if (event.candidate) socket.emit('ice-candidate', event.candidate, null);
  };

  socket.on('viewer-joined', async viewerId => {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', offer, viewerId);
  });

  socket.on('answer', async answer => {
    await peerConnection.setRemoteDescription(answer);
  });

  socket.on('ice-candidate', async candidate => {
    try {
      await peerConnection.addIceCandidate(candidate);
    } catch (e) {
      console.error('Error adding ICE candidate:', e);
    }
  });
};

viewBtn.onclick = async () => {
  const roomId = roomInput.value.trim();
  if (!roomId) return alert('Enter room code to view screen');

  socket.emit('join-room', roomId, 'viewer');

  peerConnection = new RTCPeerConnection(config);

  peerConnection.ontrack = event => {
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = event => {
    if (event.candidate) socket.emit('ice-candidate', event.candidate, null);
  };

  socket.on('offer', async (offer, sharerId) => {
    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', answer, sharerId);
  });

  socket.on('sharer-left', () => {
    alert('Sharer disconnected');
    remoteVideo.srcObject = null;
  });

  socket.on('ice-candidate', async candidate => {
    try {
      await peerConnection.addIceCandidate(candidate);
    } catch (e) {
      console.error('Error adding ICE candidate:', e);
    }
  });
};
