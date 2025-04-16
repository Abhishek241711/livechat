const ws = new WebSocket(`ws://${location.host}`);
const chatWindow = document.getElementById("chatWindow");
const usernameInput = document.getElementById("username");
const messageInput = document.getElementById("messageInput");
const imageInput = document.getElementById("imageInput");
const sendBtn = document.getElementById("sendBtn");

let currentUser = localStorage.getItem("chatUser");
let replyTo = null;

ws.onopen = () => {
  if (currentUser) {
    usernameInput.value = currentUser;
    usernameInput.disabled = true;
    ws.send(JSON.stringify({ type: "join", user: currentUser }));
  } else {
    usernameInput.addEventListener("blur", () => {
      const user = usernameInput.value.trim();
      if (user) {
        ws.send(JSON.stringify({ type: "join", user }));
      }
    });
  }
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "error") {
    alert(data.message);
    usernameInput.disabled = false;
    usernameInput.value = "";
    localStorage.removeItem("chatUser");
    currentUser = null;
    return;
  }

  if (data.type === "joined") {
    currentUser = data.user;
    localStorage.setItem("chatUser", currentUser);
    usernameInput.value = currentUser;
    usernameInput.disabled = true;
    return;
  }

  if (data.type === "init") {
    data.messages.forEach((msg) =>
      appendMessage(msg.user, msg.text, msg.image, msg.time, msg.replyTo)
    );
  } else if (data.type === "new") {
    const msg = data.message;
    appendMessage(msg.user, msg.text, msg.image, msg.time, msg.replyTo);
  }
};

function appendMessage(user, text, imageUrl, time, replyToMsg) {
  const div = document.createElement("div");
  div.classList.add("message");

  const isMe = user === currentUser;
  div.classList.add(isMe ? "me" : "them");

  // Make it draggable for reply
  div.draggable = true;
  div.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ user, text }));
    div.setAttribute("data-dragging", "true");
    e.dataTransfer.effectAllowed = "move";
    div.dataset.dragStartX = e.clientX;
  });
  div.addEventListener("dragend", (e) => {
    const startX = parseInt(div.dataset.dragStartX || "0");
    const endX = e.clientX;
    const diff = endX - startX;
    if (diff > 100) {
      // Dragged right
      setReplyPreview(user, text);
    }
  });

  const msgTime = time ? new Date(time) : new Date();
  const formattedTime = formatAMPM(msgTime);
  const safeText = text ? escapeHtml(text) : "";

  let content = "";

  if (replyToMsg) {
    content += `<div class="reply-preview"><em>Replying to <strong>${escapeHtml(replyToMsg.user)}</strong>: ${escapeHtml(replyToMsg.text)}</em></div>`;
  }

  content += `<strong>${user}</strong>: ${safeText}`;

  if (imageUrl) {
    content += `<br><img src="${imageUrl}" style="max-width: 100%; border-radius: 8px; margin-top: 5px;" />`;
  }

  content += `<div class="timestamp">${formattedTime}</div>`;

  div.innerHTML = content;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function formatAMPM(date) {
  let hours = date.getHours();
  let minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  minutes = minutes < 10 ? "0" + minutes : minutes;
  return hours + ":" + minutes + " " + ampm;
}

function sendMessage() {
  const user = usernameInput.value.trim();
  const text = messageInput.value.trim();
  const file = imageInput.files[0];
  const time = new Date().toISOString();

  if (!user || (!text && !file)) return;

  const payload = {
    type: "message",
    user,
    text,
    time,
  };

  if (replyTo) {
    payload.replyTo = replyTo;
  }

  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      payload.image = reader.result;
      ws.send(JSON.stringify(payload));
    };
    reader.readAsDataURL(file);
  } else {
    ws.send(JSON.stringify(payload));
  }

  messageInput.value = "";
  imageInput.value = null;
  clearReplyPreview();
}

sendBtn.addEventListener("click", sendMessage);

messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Reply preview display
function setReplyPreview(user, text) {
  replyTo = { user, text };
  let preview = document.getElementById("replyPreview");
  if (!preview) {
    preview = document.createElement("div");
    preview.id = "replyPreview";
    preview.style.padding = "5px";
    preview.style.borderLeft = "4px solid #aaa";
    preview.style.marginBottom = "5px";
    preview.style.background = "#f1f1f1";
    preview.style.fontSize = "14px";
    preview.style.fontStyle = "italic";
    preview.innerHTML = `Replying to <strong>${escapeHtml(user)}</strong>: ${escapeHtml(text)} <button id="cancelReply" style="float:right;">✕</button>`;
    messageInput.parentElement.insertBefore(preview, messageInput);
    document.getElementById("cancelReply").onclick = clearReplyPreview;
  } else {
    preview.innerHTML = `Replying to <strong>${escapeHtml(user)}</strong>: ${escapeHtml(text)} <button id="cancelReply" style="float:right;">✕</button>`;
    document.getElementById("cancelReply").onclick = clearReplyPreview;
  }
}

function clearReplyPreview() {
  replyTo = null;
  const preview = document.getElementById("replyPreview");
  if (preview) preview.remove();
}
