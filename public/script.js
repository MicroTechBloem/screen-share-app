const socket = io();
const urlParts = window.location.pathname.split("/");
const isSharer = urlParts[1] === "share";
const roomId = isSharer ? "room1" : urlParts[2]; // simple room ID for now

socket.emit("join-room", roomId);

if (isSharer) {
  document.getElementById("start").onclick = async () => {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    const videoTrack = stream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(videoTrack);

    setInterval(async () => {
      const bitmap = await imageCapture.grabFrame();
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext("2d").drawImage(bitmap, 0, 0);
      const dataURL = canvas.toDataURL("image/jpeg", 0.7);

      socket.emit("screen-stream", { room: roomId, image: dataURL });
    }, 150);
  };
} else {
  const viewer = document.getElementById("viewer");
  socket.on("screen-stream", (data) => {
    viewer.src = data.image;
  });
}
